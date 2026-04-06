import { describe, it, expect } from "vitest";
import { generatePageObject } from "../src/scanner/page-generator";
import type { RankedLocator } from "../src/scanner/locator-ranker";
import type { ElementInfo } from "../src/scanner/page-analyzer";

function makeLocator(overrides: Partial<RankedLocator> = {}): RankedLocator {
  const el: ElementInfo = {
    tagName: "input",
    type: "text",
    id: null,
    name: null,
    placeholder: null,
    ariaLabel: null,
    ariaLabelledBy: null,
    role: null,
    testId: "email",
    visibleText: null,
    associatedLabel: null,
    classes: [],
  };
  return {
    element: el,
    strategy: "getByTestId",
    code: 'this.page.getByTestId("email")',
    score: 5,
    variableName: "emailInput",
    ...overrides,
  };
}

describe("generatePageObject", () => {
  it("generates a valid Page Object class", () => {
    const locators = [makeLocator()];
    const { content } = generatePageObject("https://example.com/login", "Login Page", locators);

    expect(content).toContain("export class LoginPage extends BasePage");
    expect(content).toContain('readonly path = "/login"');
    expect(content).toContain("readonly pageTitle = /Login/");
    expect(content).toContain('import { BasePage } from "../core/base.page"');
    expect(content).toContain("private readonly emailInput");
  });

  it("converts URL path to class name", () => {
    const { content } = generatePageObject("https://example.com/user/settings", "Settings", [makeLocator()]);
    expect(content).toContain("export class UserSettingsPage extends BasePage");
    expect(content).toContain('readonly path = "/user/settings"');
  });

  it("uses Home for root path", () => {
    const { content } = generatePageObject("https://example.com/", "Home", [makeLocator()]);
    expect(content).toContain("export class HomePage extends BasePage");
  });

  it("deduplicates variable names", () => {
    const locators = [
      makeLocator({ variableName: "emailInput" }),
      makeLocator({ variableName: "emailInput" }),
      makeLocator({ variableName: "submitButton" }),
    ];
    const { content } = generatePageObject("https://example.com/form", "Form", locators);
    expect(content).toContain("emailInput1");
    expect(content).toContain("emailInput2");
    expect(content).toContain("submitButton");
  });

  it("generates correct output file path", () => {
    const { outputPath } = generatePageObject("https://example.com/user-profile", "Profile", [makeLocator()]);
    expect(outputPath).toContain("user-profile.page.ts");
  });

  it("includes TODO sections for actions and assertions", () => {
    const { content } = generatePageObject("https://example.com/test", "Test", [makeLocator()]);
    expect(content).toContain("// ── Actions ──");
    expect(content).toContain("// ── Assertions ──");
  });
});
