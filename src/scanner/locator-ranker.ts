import type { ElementInfo } from "./page-analyzer";

export interface RankedLocator {
  element: ElementInfo;
  strategy: string;
  code: string;
  score: number;
  variableName: string;
}

// Implicit ARIA roles for common HTML elements
const IMPLICIT_ROLES: Record<string, string> = {
  button: "button",
  a: "link",
  select: "combobox",
  textarea: "textbox",
};

export function getImplicitRole(el: ElementInfo): string | null {
  if (el.role) return el.role;

  if (el.tagName === "input") {
    const type = (el.type || "text").toLowerCase();
    const inputRoles: Record<string, string> = {
      text: "textbox",
      email: "textbox",
      password: "textbox",
      search: "searchbox",
      tel: "textbox",
      url: "textbox",
      number: "spinbutton",
      checkbox: "checkbox",
      radio: "radio",
    };
    return inputRoles[type] || null;
  }

  return IMPLICIT_ROLES[el.tagName] || null;
}

export function getAccessibleName(el: ElementInfo): string | null {
  return el.ariaLabel || el.ariaLabelledBy || el.associatedLabel || el.visibleText || null;
}

export function isGeneratedId(id: string): boolean {
  // UUIDs, hex strings, or strings with lots of digits
  if (/[0-9a-f]{8,}/i.test(id)) return true;
  if (/^\d+$/.test(id)) return true;
  if (/[:.]/.test(id) && id.length > 20) return true;
  return false;
}

function toVariableName(raw: string): string {
  // Clean up and convert to camelCase
  const cleaned = raw
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .trim()
    .slice(0, 40);

  const parts = cleaned.split(/[\s\-_]+/).filter(Boolean);
  if (parts.length === 0) return "element";

  return parts
    .map((p, i) =>
      i === 0
        ? p.toLowerCase()
        : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(),
    )
    .join("");
}

export function suggestVariableName(el: ElementInfo): string {
  // Prefer code-level attributes (always English) over visible text (can be localized)
  const source =
    el.testId ||
    el.id ||
    el.name ||
    el.ariaLabel ||
    el.associatedLabel ||
    el.placeholder ||
    el.visibleText ||
    el.tagName;

  let name = toVariableName(source);

  // Append element type suffix for clarity
  const suffixes: Record<string, string> = {
    input: "Input",
    textarea: "Textarea",
    select: "Select",
    button: "Button",
    a: "Link",
  };

  const suffix = suffixes[el.tagName];
  if (suffix && !name.toLowerCase().endsWith(suffix.toLowerCase())) {
    name += suffix;
  }

  return name;
}

export function escapeStr(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function rankLocator(el: ElementInfo): RankedLocator {
  const role = getImplicitRole(el);
  const accessibleName = getAccessibleName(el);

  // Strategy 1: getByTestId — stable, language-independent, explicitly for testing
  if (el.testId) {
    return {
      element: el,
      strategy: "getByTestId",
      code: `this.page.getByTestId("${escapeStr(el.testId)}")`,
      score: 5,
      variableName: suggestVariableName(el),
    };
  }

  // Strategy 2: locator by ID — stable, language-independent
  if (el.id && !isGeneratedId(el.id)) {
    return {
      element: el,
      strategy: "locator#id",
      code: `this.page.locator("#${escapeStr(el.id)}")`,
      score: 4,
      variableName: suggestVariableName(el),
    };
  }

  // Strategy 3: getByRole with name — good semantics, but can break on locale change
  if (role && accessibleName) {
    const nameOpt = `{ name: "${escapeStr(accessibleName)}" }`;
    return {
      element: el,
      strategy: "getByRole",
      code: `this.page.getByRole("${role}", ${nameOpt})`,
      score: 3,
      variableName: suggestVariableName(el),
    };
  }

  // Strategy 4: getByLabel — can break on locale change
  if (el.associatedLabel) {
    return {
      element: el,
      strategy: "getByLabel",
      code: `this.page.getByLabel("${escapeStr(el.associatedLabel)}")`,
      score: 3,
      variableName: suggestVariableName(el),
    };
  }

  // Strategy 5: getByPlaceholder — can break on locale change
  if (el.placeholder) {
    return {
      element: el,
      strategy: "getByPlaceholder",
      code: `this.page.getByPlaceholder("${escapeStr(el.placeholder)}")`,
      score: 2,
      variableName: suggestVariableName(el),
    };
  }

  // Strategy 6: CSS fallback
  let selector = el.tagName;
  if (el.type) selector += `[type="${el.type}"]`;
  if (el.name) selector += `[name="${escapeStr(el.name)}"]`;
  else if (el.classes.length > 0) selector += `.${el.classes[0]}`;

  return {
    element: el,
    strategy: "locator(css)",
    code: `this.page.locator("${escapeStr(selector)}")`,
    score: 1,
    variableName: suggestVariableName(el),
  };
}
