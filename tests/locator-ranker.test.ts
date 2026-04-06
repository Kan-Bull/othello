import { describe, it, expect } from "vitest";
import {
  rankLocator,
  suggestVariableName,
  getImplicitRole,
  getAccessibleName,
  isGeneratedId,
  escapeStr,
} from "../src/scanner/locator-ranker";
import type { ElementInfo } from "../src/scanner/page-analyzer";

function makeElement(overrides: Partial<ElementInfo> = {}): ElementInfo {
  return {
    tagName: "input",
    type: "text",
    id: null,
    name: null,
    placeholder: null,
    ariaLabel: null,
    ariaLabelledBy: null,
    role: null,
    testId: null,
    visibleText: null,
    associatedLabel: null,
    classes: [],
    ...overrides,
  };
}

// ──────────────────────────────────────────────
//  rankLocator
// ──────────────────────────────────────────────

describe("rankLocator", () => {
  it("prefers getByTestId when data-testid is present", () => {
    const el = makeElement({ testId: "login-btn", tagName: "button" });
    const result = rankLocator(el);
    expect(result.strategy).toBe("getByTestId");
    expect(result.score).toBe(5);
    expect(result.code).toContain('getByTestId("login-btn")');
  });

  it("uses locator#id when id is present and not generated", () => {
    const el = makeElement({ id: "username" });
    const result = rankLocator(el);
    expect(result.strategy).toBe("locator#id");
    expect(result.score).toBe(4);
    expect(result.code).toContain('locator("#username")');
  });

  it("skips generated IDs and falls through to next strategy", () => {
    const el = makeElement({ id: "a1b2c3d4e5f6a1b2", ariaLabel: "Email" });
    const result = rankLocator(el);
    expect(result.strategy).not.toBe("locator#id");
  });

  it("uses getByRole with name when role and accessible name are available", () => {
    const el = makeElement({ tagName: "button", visibleText: "Submit" });
    const result = rankLocator(el);
    expect(result.strategy).toBe("getByRole");
    expect(result.score).toBe(3);
    expect(result.code).toContain('getByRole("button"');
    expect(result.code).toContain("Submit");
  });

  it("uses getByLabel when associatedLabel is present and no role", () => {
    // Input has an implicit textbox role, so associatedLabel becomes the role name.
    // Use a tag with no implicit role to test the getByLabel fallback.
    const el = makeElement({ tagName: "div", type: null, associatedLabel: "Email address" });
    const result = rankLocator(el);
    expect(result.strategy).toBe("getByLabel");
    expect(result.score).toBe(3);
  });

  it("uses getByPlaceholder as lower priority", () => {
    const el = makeElement({ placeholder: "Enter your email" });
    const result = rankLocator(el);
    expect(result.strategy).toBe("getByPlaceholder");
    expect(result.score).toBe(2);
  });

  it("falls back to CSS locator when nothing else works", () => {
    const el = makeElement({ tagName: "input", type: "text", name: "email" });
    const result = rankLocator(el);
    expect(result.strategy).toBe("locator(css)");
    expect(result.score).toBe(1);
    expect(result.code).toContain("email");
  });

  it("uses class as CSS fallback when no name", () => {
    const el = makeElement({ tagName: "div", type: null, name: null, classes: ["login-form"] });
    const result = rankLocator(el);
    expect(result.strategy).toBe("locator(css)");
    expect(result.code).toContain(".login-form");
  });
});

// ──────────────────────────────────────────────
//  getImplicitRole
// ──────────────────────────────────────────────

describe("getImplicitRole", () => {
  it("returns explicit role when set", () => {
    const el = makeElement({ role: "navigation" });
    expect(getImplicitRole(el)).toBe("navigation");
  });

  it("maps button tag to button role", () => {
    const el = makeElement({ tagName: "button" });
    expect(getImplicitRole(el)).toBe("button");
  });

  it("maps anchor tag to link role", () => {
    const el = makeElement({ tagName: "a" });
    expect(getImplicitRole(el)).toBe("link");
  });

  it("maps input[type=text] to textbox role", () => {
    const el = makeElement({ tagName: "input", type: "text" });
    expect(getImplicitRole(el)).toBe("textbox");
  });

  it("maps input[type=checkbox] to checkbox role", () => {
    const el = makeElement({ tagName: "input", type: "checkbox" });
    expect(getImplicitRole(el)).toBe("checkbox");
  });

  it("maps input[type=search] to searchbox role", () => {
    const el = makeElement({ tagName: "input", type: "search" });
    expect(getImplicitRole(el)).toBe("searchbox");
  });

  it("returns null for unknown input types", () => {
    const el = makeElement({ tagName: "input", type: "file" });
    expect(getImplicitRole(el)).toBeNull();
  });

  it("returns null for elements without implicit role", () => {
    const el = makeElement({ tagName: "div" });
    expect(getImplicitRole(el)).toBeNull();
  });
});

// ──────────────────────────────────────────────
//  getAccessibleName
// ──────────────────────────────────────────────

describe("getAccessibleName", () => {
  it("prefers ariaLabel", () => {
    const el = makeElement({ ariaLabel: "Close", visibleText: "X" });
    expect(getAccessibleName(el)).toBe("Close");
  });

  it("falls back to ariaLabelledBy", () => {
    const el = makeElement({ ariaLabelledBy: "header-title" });
    expect(getAccessibleName(el)).toBe("header-title");
  });

  it("falls back to associatedLabel", () => {
    const el = makeElement({ associatedLabel: "Username" });
    expect(getAccessibleName(el)).toBe("Username");
  });

  it("falls back to visibleText", () => {
    const el = makeElement({ visibleText: "Click me" });
    expect(getAccessibleName(el)).toBe("Click me");
  });

  it("returns null when nothing available", () => {
    const el = makeElement();
    expect(getAccessibleName(el)).toBeNull();
  });
});

// ──────────────────────────────────────────────
//  isGeneratedId
// ──────────────────────────────────────────────

describe("isGeneratedId", () => {
  it("detects UUIDs as generated", () => {
    expect(isGeneratedId("a1b2c3d4e5f6a7b8")).toBe(true);
  });

  it("detects numeric-only IDs as generated", () => {
    expect(isGeneratedId("12345")).toBe(true);
  });

  it("detects long colon/dot IDs as generated", () => {
    expect(isGeneratedId("ember.component:1234567890.abc")).toBe(true);
  });

  it("accepts meaningful short IDs", () => {
    expect(isGeneratedId("login-form")).toBe(false);
  });

  it("accepts semantic IDs", () => {
    expect(isGeneratedId("navbar")).toBe(false);
  });
});

// ──────────────────────────────────────────────
//  suggestVariableName
// ──────────────────────────────────────────────

describe("suggestVariableName", () => {
  it("uses testId as source", () => {
    const el = makeElement({ tagName: "button", testId: "submit-form" });
    expect(suggestVariableName(el)).toBe("submitFormButton");
  });

  it("uses id as source when no testId", () => {
    const el = makeElement({ tagName: "input", id: "email-field" });
    expect(suggestVariableName(el)).toBe("emailFieldInput");
  });

  it("appends element type suffix", () => {
    const el = makeElement({ tagName: "a", visibleText: "Home" });
    expect(suggestVariableName(el)).toBe("homeLink");
  });

  it("does not double-suffix", () => {
    const el = makeElement({ tagName: "button", testId: "login-button" });
    expect(suggestVariableName(el)).toBe("loginButton");
  });
});

// ──────────────────────────────────────────────
//  escapeStr
// ──────────────────────────────────────────────

describe("escapeStr", () => {
  it("escapes double quotes", () => {
    expect(escapeStr('say "hello"')).toBe('say \\"hello\\"');
  });

  it("escapes backslashes", () => {
    expect(escapeStr("path\\to")).toBe("path\\\\to");
  });

  it("leaves clean strings unchanged", () => {
    expect(escapeStr("hello")).toBe("hello");
  });
});
