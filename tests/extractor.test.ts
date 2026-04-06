import { describe, it, expect } from "vitest";
import { parseHtmlElement, parseAllElements } from "../src/extractor";

// ──────────────────────────────────────────────
//  parseHtmlElement
// ──────────────────────────────────────────────

describe("parseHtmlElement", () => {
  it("parses a simple button with id", () => {
    const el = parseHtmlElement('<button id="submit">OK</button>');
    expect(el.tagName).toBe("button");
    expect(el.id).toBe("submit");
    expect(el.visibleText).toBe("OK");
  });

  it("parses data-testid attribute", () => {
    const el = parseHtmlElement('<input data-testid="email-input" type="email">');
    expect(el.testId).toBe("email-input");
    expect(el.type).toBe("email");
  });

  it("parses data-cy attribute as testId", () => {
    const el = parseHtmlElement('<button data-cy="login-btn">Login</button>');
    expect(el.testId).toBe("login-btn");
  });

  it("parses data-qa attribute as testId", () => {
    const el = parseHtmlElement('<div data-qa="modal"></div>');
    expect(el.testId).toBe("modal");
  });

  it("parses aria-label", () => {
    const el = parseHtmlElement('<button aria-label="Close dialog">X</button>');
    expect(el.ariaLabel).toBe("Close dialog");
    expect(el.visibleText).toBe("X");
  });

  it("parses role attribute", () => {
    const el = parseHtmlElement('<div role="alert">Error!</div>');
    expect(el.role).toBe("alert");
    expect(el.visibleText).toBe("Error!");
  });

  it("parses placeholder", () => {
    const el = parseHtmlElement('<input placeholder="Enter email">');
    expect(el.placeholder).toBe("Enter email");
  });

  it("parses name attribute", () => {
    const el = parseHtmlElement('<input name="username" type="text">');
    expect(el.name).toBe("username");
    expect(el.type).toBe("text");
  });

  it("parses class list", () => {
    const el = parseHtmlElement('<div class="btn btn-primary large"></div>');
    expect(el.classes).toEqual(["btn", "btn-primary", "large"]);
  });

  it("strips inner HTML tags to get visible text", () => {
    const el = parseHtmlElement('<div><span>Hello</span> <b>World</b></div>');
    expect(el.visibleText).toBe("Hello World");
  });

  it("truncates long visible text to 50 chars", () => {
    const longText = "A".repeat(60);
    const el = parseHtmlElement(`<p>${longText}</p>`);
    expect(el.visibleText).toBe("A".repeat(47) + "...");
  });

  it("handles self-closing tags", () => {
    const el = parseHtmlElement('<input type="checkbox" id="agree" />');
    expect(el.tagName).toBe("input");
    expect(el.type).toBe("checkbox");
    expect(el.id).toBe("agree");
  });

  it("returns null for missing attributes", () => {
    const el = parseHtmlElement("<div></div>");
    expect(el.id).toBeNull();
    expect(el.testId).toBeNull();
    expect(el.ariaLabel).toBeNull();
    expect(el.placeholder).toBeNull();
    expect(el.name).toBeNull();
    expect(el.role).toBeNull();
  });
});

// ──────────────────────────────────────────────
//  parseAllElements
// ──────────────────────────────────────────────

describe("parseAllElements", () => {
  it("parses root and child elements", () => {
    const html = `
      <form id="login-form">
        <input data-testid="email" type="email">
        <input data-testid="password" type="password">
        <button id="submit">Sign In</button>
      </form>
    `;
    const elements = parseAllElements(html);
    expect(elements.length).toBe(4);
    expect(elements[0].tagName).toBe("form");
    expect(elements[0].id).toBe("login-form");
    expect(elements[1].testId).toBe("email");
    expect(elements[2].testId).toBe("password");
    expect(elements[3].tagName).toBe("button");
    expect(elements[3].id).toBe("submit");
  });

  it("returns empty array for non-HTML input", () => {
    expect(parseAllElements("just text, no tags")).toEqual([]);
  });

  it("handles single element", () => {
    const elements = parseAllElements('<button id="ok">OK</button>');
    expect(elements.length).toBe(1);
    expect(elements[0].tagName).toBe("button");
  });

  it("handles void elements (input, img, br)", () => {
    const html = '<div><input type="text" name="q"><br><img src="logo.png" alt="Logo"></div>';
    const elements = parseAllElements(html);
    const tags = elements.map((e) => e.tagName);
    expect(tags).toContain("input");
    expect(tags).toContain("br");
    expect(tags).toContain("img");
  });

  it("extracts text content for non-void children", () => {
    const html = '<nav><a href="/home">Home</a><a href="/about">About</a></nav>';
    const elements = parseAllElements(html);
    const links = elements.filter((e) => e.tagName === "a");
    expect(links).toHaveLength(2);
    expect(links[0].visibleText).toBe("Home");
    expect(links[1].visibleText).toBe("About");
  });
});
