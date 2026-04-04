import kleur from "kleur";
import type { ElementInfo } from "../scanner/page-analyzer";
import {
  escapeStr,
  getAccessibleName,
  getImplicitRole,
  isGeneratedId,
  rankLocator,
  suggestVariableName,
} from "../scanner/locator-ranker";

/** Utility CSS classes that make poor locators. */
const UTILITY_CLASS_PATTERNS = [
  /^[mp][trblxy]?-\d/,   // margin/padding utilities (mt-3, px-4, etc.)
  /^[wh]-\d/,             // width/height utilities
  /^(d|flex|grid|block|inline|hidden|visible|show|fade|collapse)/,
  /^(text|font|bg|border|rounded|shadow|overflow|cursor|opacity|transition|animate)/,
  /^(justify|items|self|content|place|gap|space|order)/,
  /^(col|row|container|wrapper|clearfix)/,
  /^(sr-only|visually-hidden|screenreader)/,
  /^(active|disabled|focus|hover|selected|open|closed|collapsed)/,
];

function isUtilityClass(cls: string): boolean {
  return UTILITY_CLASS_PATTERNS.some((p) => p.test(cls));
}

interface LocatorCandidate {
  strategy: string;
  code: string;
  score: number;
}

// ──────────────────────────────────────────────
//  HTML Parsing (regex-based, single element)
// ──────────────────────────────────────────────

/**
 * Parse a single HTML element string into an ElementInfo.
 * Handles self-closing tags and elements with content.
 */
export function parseHtmlElement(html: string): ElementInfo {
  const trimmed = html.trim();

  // Extract tag name
  const tagMatch = trimmed.match(/^<(\w+)[\s>/]/);
  const tagName = tagMatch ? tagMatch[1].toLowerCase() : "div";

  // Extract all attributes from the opening tag
  const openTagMatch = trimmed.match(/^<\w+([^>]*)>/);
  const attrString = openTagMatch ? openTagMatch[1] : "";

  const attrs: Record<string, string> = {};
  const attrRegex = /([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(attrString)) !== null) {
    const name = match[1];
    const value = match[2] ?? match[3] ?? "";
    attrs[name] = value;
  }

  // Extract visible text: content between opening and closing tag, strip inner HTML tags
  let visibleText: string | null = null;
  const contentMatch = trimmed.match(/^<\w+[^>]*>([\s\S]*?)<\/\w+>$/);
  if (contentMatch) {
    const raw = contentMatch[1].replace(/<[^>]*>/g, "").trim();
    if (raw.length > 0) {
      visibleText = raw.length > 50 ? raw.slice(0, 47) + "..." : raw;
    }
  }

  // Find test ID across common attributes
  const testIdAttrs = ["data-testid", "data-test", "data-cy", "data-qa"];
  let testId: string | null = null;
  for (const attr of testIdAttrs) {
    if (attrs[attr]) {
      testId = attrs[attr];
      break;
    }
  }

  // Extract classes
  const classes = attrs.class
    ? attrs.class.split(/\s+/).filter(Boolean)
    : [];

  return {
    tagName,
    type: attrs.type || null,
    id: attrs.id || null,
    name: attrs.name || null,
    placeholder: attrs.placeholder || null,
    ariaLabel: attrs["aria-label"] || null,
    ariaLabelledBy: attrs["aria-labelledby"] || null,
    role: attrs.role || null,
    testId,
    visibleText,
    associatedLabel: null, // not available from a single element
    classes,
  };
}

// ──────────────────────────────────────────────
//  Generate ALL locator candidates
// ──────────────────────────────────────────────

/**
 * Generate all possible Playwright locator candidates for the given element,
 * each with a stability score.
 */
function generateAllLocators(el: ElementInfo): LocatorCandidate[] {
  const candidates: LocatorCandidate[] = [];
  const role = getImplicitRole(el);
  const accessibleName = getAccessibleName(el);

  // testId — score 5
  if (el.testId) {
    candidates.push({
      strategy: "getByTestId",
      code: `getByTestId("${escapeStr(el.testId)}")`,
      score: 5,
    });
  }

  // id (non-generated) — score 4
  if (el.id && !isGeneratedId(el.id)) {
    candidates.push({
      strategy: "locator#id",
      code: `locator("#${escapeStr(el.id)}")`,
      score: 4,
    });
  }

  // role — score 3
  if (role) {
    if (accessibleName) {
      candidates.push({
        strategy: "getByRole",
        code: `getByRole("${role}", { name: "${escapeStr(accessibleName)}" })`,
        score: 3,
      });
    } else {
      candidates.push({
        strategy: "getByRole",
        code: `getByRole("${role}")`,
        score: 3,
      });
    }
  }

  // aria-label — score 3 (only if not already used as role name)
  if (el.ariaLabel && !(role && accessibleName === el.ariaLabel)) {
    candidates.push({
      strategy: "getByLabel",
      code: `getByLabel("${escapeStr(el.ariaLabel)}")`,
      score: 3,
    });
  }

  // placeholder — score 2
  if (el.placeholder) {
    candidates.push({
      strategy: "getByPlaceholder",
      code: `getByPlaceholder("${escapeStr(el.placeholder)}")`,
      score: 2,
    });
  }

  // visible text — score 2
  if (el.visibleText) {
    candidates.push({
      strategy: "getByText",
      code: `getByText("${escapeStr(el.visibleText)}")`,
      score: 2,
    });
  }

  // name attribute — score 1
  if (el.name) {
    candidates.push({
      strategy: "locator[name]",
      code: `locator('[name="${escapeStr(el.name)}"]')`,
      score: 1,
    });
  }

  // classes (non-utility) — score 1
  for (const cls of el.classes) {
    if (!isUtilityClass(cls)) {
      candidates.push({
        strategy: "locator(css)",
        code: `locator(".${escapeStr(cls)}")`,
        score: 1,
      });
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  return candidates;
}

// ──────────────────────────────────────────────
//  Terminal display
// ──────────────────────────────────────────────

function stabilityIcon(score: number): string {
  if (score >= 4) return kleur.green("\u2B24");  // green circle
  if (score === 3) return kleur.yellow("\u2B24"); // yellow circle
  return kleur.red("\u2B24");                     // red circle
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 3) + "..." : str;
}

/**
 * Extract locators from a raw HTML element string and display them.
 */
export function extract(html: string): void {
  const el = parseHtmlElement(html);
  const candidates = generateAllLocators(el);
  const best = rankLocator(el);
  const varName = suggestVariableName(el);

  // Header
  console.log();
  console.log(kleur.bold().cyan("  \uD83D\uDD0D Analyzing element..."));
  console.log();

  // Element summary
  const textHint = el.visibleText ? ` with text "${truncate(el.visibleText, 40)}"` : "";
  console.log(`  Element: ${kleur.bold(`<${el.tagName}>`)}${kleur.dim(textHint)}`);
  console.log();

  if (candidates.length === 0) {
    console.log(kleur.yellow("  \u26A0 No locator strategies found for this element.\n"));
    return;
  }

  // Table
  const numW = 4;
  const stratW = 18;
  const locW = 46;
  const stabW = 9;
  const totalW = numW + stratW + locW + stabW;

  const line = "\u2500".repeat(totalW);
  console.log(`  \u250C${"\u2500".repeat(totalW)}\u2510`);
  console.log(
    `  \u2502` +
    kleur.bold(" #".padEnd(numW)) +
    kleur.bold("Strategy".padEnd(stratW)) +
    kleur.bold("Locator".padEnd(locW)) +
    kleur.bold("Stability".padEnd(stabW)) +
    `\u2502`,
  );
  console.log(`  \u251C${line}\u2524`);

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const num = ` ${i + 1}`.padEnd(numW);
    const strat = c.strategy.padEnd(stratW);
    const loc = truncate(c.code, locW - 2).padEnd(locW);
    const icon = stabilityIcon(c.score);

    console.log(`  \u2502${num}${strat}${loc}   ${icon}   \u2502`);
  }

  console.log(`  \u2514${line}\u2518`);
  console.log();

  // Suggested variable name
  console.log(`  ${kleur.bold("Variable name:")} ${kleur.cyan(varName)}`);
  console.log();

  // Copy-paste ready line
  console.log(`  ${kleur.bold("Copy-paste ready:")}`);
  console.log(kleur.green(`    private readonly ${varName} = ${best.code};`));
  console.log();
}
