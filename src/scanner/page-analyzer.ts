import type { Page } from "playwright";

export interface ElementInfo {
  tagName: string;
  type: string | null;
  id: string | null;
  name: string | null;
  placeholder: string | null;
  ariaLabel: string | null;
  ariaLabelledBy: string | null;
  role: string | null;
  testId: string | null;
  visibleText: string | null;
  associatedLabel: string | null;
  classes: string[];
}

const INTERACTIVE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  'a[href]',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
].join(", ");

export async function analyzeElements(
  page: Page,
  testIdAttr: string,
): Promise<ElementInfo[]> {
  return page.evaluate(
    ({ selector, testIdAttr }) => {
      const elements = document.querySelectorAll(selector);
      const results: ElementInfo[] = [];

      for (const el of elements) {
        const htmlEl = el as HTMLElement;

        // Skip hidden elements
        if (htmlEl.offsetParent === null && htmlEl.tagName !== "BODY") continue;

        // Find associated label
        let associatedLabel: string | null = null;
        const id = htmlEl.getAttribute("id");
        if (id) {
          const labelFor = document.querySelector(`label[for="${id}"]`);
          if (labelFor) {
            associatedLabel = (labelFor.textContent || "").trim().slice(0, 50);
          }
        }
        if (!associatedLabel) {
          const parentLabel = htmlEl.closest("label");
          if (parentLabel) {
            const clone = parentLabel.cloneNode(true) as HTMLElement;
            // Remove the input itself to get only label text
            const inputs = clone.querySelectorAll("input, textarea, select, button");
            for (const inp of inputs) inp.remove();
            associatedLabel = (clone.textContent || "").trim().slice(0, 50) || null;
          }
        }

        // Resolve aria-labelledby
        const ariaLabelledBy = htmlEl.getAttribute("aria-labelledby");
        let resolvedAriaLabelledBy: string | null = null;
        if (ariaLabelledBy) {
          const refEl = document.getElementById(ariaLabelledBy);
          resolvedAriaLabelledBy = refEl
            ? (refEl.textContent || "").trim().slice(0, 50)
            : ariaLabelledBy;
        }

        // Find test ID across common attributes
        const testIdAttrs = [testIdAttr, "data-testid", "data-test", "data-cy", "data-qa"];
        let testIdValue: string | null = null;
        for (const attr of testIdAttrs) {
          const val = htmlEl.getAttribute(attr);
          if (val) {
            testIdValue = val;
            break;
          }
        }

        // Visible text (truncated)
        const rawText = (htmlEl.innerText || htmlEl.textContent || "").trim();
        const visibleText = rawText.length > 50 ? rawText.slice(0, 47) + "..." : rawText || null;

        results.push({
          tagName: htmlEl.tagName.toLowerCase(),
          type: htmlEl.getAttribute("type"),
          id: id || null,
          name: htmlEl.getAttribute("name"),
          placeholder: htmlEl.getAttribute("placeholder"),
          ariaLabel: htmlEl.getAttribute("aria-label"),
          ariaLabelledBy: resolvedAriaLabelledBy,
          role: htmlEl.getAttribute("role"),
          testId: testIdValue,
          visibleText,
          associatedLabel,
          classes: Array.from(htmlEl.classList),
        });
      }

      return results;
    },
    { selector: INTERACTIVE_SELECTOR, testIdAttr },
  );
}
