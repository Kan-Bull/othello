import type { Page } from "playwright";
import type {
  CollectedAlert,
  CollectedButton,
  CollectedInput,
  CollectedLink,
  CollectedSelect,
  FormInfo,
  PageAnalysis,
} from "./types";

interface RawInput {
  tagName: string;
  type: string;
  id: string;
  name: string;
  required: boolean;
  pattern: string;
  minlength: number | null;
  maxlength: number | null;
  min: string;
  max: string;
  step: string;
  ariaLabel: string;
  ariaRequired: boolean;
  role: string;
  label: string;
  placeholder: string;
  disabled: boolean;
  readonly: boolean;
  formMethod: string;
  inForm: boolean;
  formIndex: number;
}

interface RawSelect {
  id: string;
  name: string;
  required: boolean;
  label: string;
  ariaLabel: string;
  disabled: boolean;
  inForm: boolean;
  formIndex: number;
  options: { value: string; text: string }[];
}

interface RawButton {
  type: string;
  text: string;
  id: string;
  name: string;
  disabled: boolean;
  inForm: boolean;
  formIndex: number;
}

interface RawData {
  inputs: RawInput[];
  selects: RawSelect[];
  buttons: RawButton[];
  links: CollectedLink[];
  alerts: CollectedAlert[];
  formMethods: string[];
}

export async function collectElements(page: Page, url: string): Promise<PageAnalysis> {
  const title = await page.title();

  const raw: RawData = await page.evaluate(() => {
    // biome-ignore lint: function is serialized for browser context
    function getLabel(el: Element): string {
      const id = el.getAttribute("id");
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return label.textContent?.trim() || "";
      }
      const parent = el.closest("label");
      if (parent) return parent.textContent?.trim() || "";
      return "";
    }

    const forms = Array.from(document.querySelectorAll("form"));
    const formMethods = forms.map((f) => (f.getAttribute("method") || "GET").toUpperCase());

    function getFormIndex(el: Element): number {
      const form = el.closest("form");
      return form ? forms.indexOf(form) : -1;
    }

    // Inputs & textareas
    const inputEls = Array.from(
      document.querySelectorAll("input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='reset']), textarea"),
    );
    const inputs = inputEls.map((el) => {
      const inp = el as HTMLInputElement | HTMLTextAreaElement;
      const formIdx = getFormIndex(el);
      return {
        tagName: el.tagName.toLowerCase(),
        type: inp.getAttribute("type") || (el.tagName === "TEXTAREA" ? "textarea" : "text"),
        id: inp.id || "",
        name: inp.name || "",
        required: inp.required || inp.getAttribute("aria-required") === "true",
        pattern: inp.getAttribute("pattern") || "",
        minlength: inp.minLength > 0 ? inp.minLength : null,
        maxlength: inp.maxLength > 0 ? inp.maxLength : null,
        min: inp.getAttribute("min") || "",
        max: inp.getAttribute("max") || "",
        step: inp.getAttribute("step") || "",
        ariaLabel: inp.getAttribute("aria-label") || "",
        ariaRequired: inp.getAttribute("aria-required") === "true",
        role: inp.getAttribute("role") || "",
        label: getLabel(el),
        placeholder: inp.placeholder || "",
        disabled: inp.disabled,
        readonly: inp.readOnly || false,
        formMethod: formIdx >= 0 ? formMethods[formIdx] : "",
        inForm: formIdx >= 0,
        formIndex: formIdx,
      };
    });

    // Selects
    const selectEls = Array.from(document.querySelectorAll("select"));
    const selects = selectEls.map((el) => {
      const formIdx = getFormIndex(el);
      return {
        id: el.id || "",
        name: el.name || "",
        required: el.required || el.getAttribute("aria-required") === "true",
        label: getLabel(el),
        ariaLabel: el.getAttribute("aria-label") || "",
        disabled: el.disabled,
        inForm: formIdx >= 0,
        formIndex: formIdx,
        options: Array.from(el.options).map((o) => ({
          value: o.value,
          text: o.textContent?.trim() || "",
        })),
      };
    });

    // Buttons
    const buttonEls = Array.from(
      document.querySelectorAll("button, input[type='submit'], input[type='button'], input[type='reset']"),
    );
    const buttons = buttonEls.map((el) => {
      const formIdx = getFormIndex(el);
      const btn = el as HTMLButtonElement | HTMLInputElement;
      return {
        type: btn.getAttribute("type") || "submit",
        text: btn.textContent?.trim() || btn.getAttribute("value") || "",
        id: btn.id || "",
        name: btn.name || "",
        disabled: btn.disabled,
        inForm: formIdx >= 0,
        formIndex: formIdx,
      };
    });

    // Links
    const linkEls = Array.from(document.querySelectorAll("a[href]"));
    const links = linkEls.map((el) => ({
      href: el.getAttribute("href") || "",
      text: el.textContent?.trim() || "",
      ariaLabel: el.getAttribute("aria-label") || "",
    }));

    // Alerts / error elements
    const alertEls = Array.from(
      document.querySelectorAll('[role="alert"], [aria-live], .error, .danger, .invalid, .alert-danger, .alert-error'),
    );
    const alerts = alertEls.map((el) => ({
      text: el.textContent?.trim() || "",
      role: el.getAttribute("role") || "",
      classes: el.className || "",
    }));

    return { inputs, selects, buttons, links, alerts, formMethods };
  });

  // Build forms from raw data
  const formCount = raw.formMethods.length;
  const forms: FormInfo[] = [];
  for (let i = 0; i < formCount; i++) {
    forms.push({
      method: raw.formMethods[i],
      inputs: raw.inputs.filter((inp) => inp.formIndex === i),
      selects: raw.selects.filter((sel) => sel.formIndex === i),
      buttons: raw.buttons.filter((btn) => btn.formIndex === i),
    });
  }

  return {
    url,
    title,
    forms,
    standaloneInputs: raw.inputs.filter((inp) => !inp.inForm),
    buttons: raw.buttons.filter((btn) => !btn.inForm),
    links: raw.links,
    alerts: raw.alerts,
    selects: raw.selects.filter((sel) => !sel.inForm),
  };
}
