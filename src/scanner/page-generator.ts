import * as fs from "node:fs";
import * as path from "node:path";
import type { RankedLocator } from "./locator-ranker";

function toClassName(pathname: string): string {
  // /contact → Contact, /user/settings → UserSettings
  const segments = pathname
    .replace(/^\/|\/$/g, "")
    .split("/")
    .filter(Boolean);

  if (segments.length === 0) return "Home";

  return segments
    .map((s) =>
      s
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(""),
    )
    .join("");
}

function stars(score: number): string {
  return "★".repeat(score) + "☆".repeat(5 - score);
}

function deduplicateNames(locators: RankedLocator[]): void {
  const counts = new Map<string, number>();
  for (const loc of locators) {
    const count = counts.get(loc.variableName) || 0;
    counts.set(loc.variableName, count + 1);
  }

  const seen = new Map<string, number>();
  for (const loc of locators) {
    const total = counts.get(loc.variableName) || 1;
    if (total > 1) {
      const idx = (seen.get(loc.variableName) || 0) + 1;
      seen.set(loc.variableName, idx);
      loc.variableName = `${loc.variableName}${idx}`;
    }
  }
}

export function generatePageObject(
  url: string,
  pageTitle: string,
  locators: RankedLocator[],
): { content: string; outputPath: string } {
  const parsed = new URL(url);
  const baseName = toClassName(parsed.pathname);
  const className = `${baseName}Page`;
  const fileName = `${baseName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}.page.ts`;
  const pagePath = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/$/, "");

  deduplicateNames(locators);

  const lines: string[] = [];

  lines.push('import { type Page } from "@playwright/test";');
  lines.push('import { BasePage } from "../core/base.page";');
  lines.push("");
  lines.push(`export class ${className} extends BasePage {`);
  lines.push(`  readonly path = "${pagePath}";`);
  lines.push(`  readonly pageTitle = /${baseName}/;`);
  lines.push("");

  // Locators
  if (locators.length > 0) {
    lines.push("  // ── Locators ──");
    lines.push("");
    for (const loc of locators) {
      lines.push(`  private readonly ${loc.variableName} = ${loc.code}; // ${stars(loc.score)}`);
    }
    lines.push("");
  }

  // Constructor
  lines.push("  constructor(page: Page) {");
  lines.push("    super(page);");
  lines.push("  }");
  lines.push("");

  // TODO actions
  lines.push("  // ── Actions ──");
  lines.push("  // TODO: Add page actions here");
  lines.push("");

  // TODO assertions
  lines.push("  // ── Assertions ──");
  lines.push("  // TODO: Add page assertions here");

  lines.push("}");
  lines.push("");

  const content = lines.join("\n");

  // Determine output path
  const pagesDir = path.join(process.cwd(), "src", "pages");
  const outputPath = fs.existsSync(pagesDir)
    ? path.join(pagesDir, fileName)
    : path.join(process.cwd(), fileName);

  return { content, outputPath };
}
