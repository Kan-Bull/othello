import * as fs from "node:fs";
import { chromium } from "playwright";
import kleur from "kleur";
import { collectElements } from "./element-collector";
import { runRules } from "./rule-engine";
import { generateSpec } from "./spec-generator";
import type { TestCategory, TestPriority, TestSuggestion } from "./types";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function spinner(message: string): { stop: (result: string) => void } {
  let i = 0;
  const id = setInterval(() => {
    process.stdout.write(`\r  ${kleur.cyan(FRAMES[i++ % FRAMES.length])} ${message}`);
  }, 80);

  return {
    stop(result: string) {
      clearInterval(id);
      process.stdout.write(`\r  ${result}\n`);
    },
  };
}

const PRIORITY_ICONS: Record<TestPriority, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "⚪",
};

const CATEGORY_ORDER: TestCategory[] = [
  "happy-path",
  "validation",
  "edge-case",
  "security",
  "ux",
  "accessibility",
];

const CATEGORY_LABELS: Record<TestCategory, string> = {
  "happy-path": "HAPPY PATH",
  validation: "VALIDATION",
  "edge-case": "EDGE CASES",
  security: "SECURITY",
  ux: "UX",
  accessibility: "ACCESSIBILITY",
};

function printTestPlan(
  pageTitle: string,
  suggestions: TestSuggestion[],
): void {
  console.log();
  console.log(kleur.bold(`  ═══ Test plan: ${pageTitle} ═══`));

  for (const category of CATEGORY_ORDER) {
    const items = suggestions.filter((s) => s.category === category);
    if (items.length === 0) continue;

    console.log();
    console.log(kleur.bold(`  ${CATEGORY_LABELS[category]} (${items.length} tests)`));
    for (const item of items) {
      console.log(`  ${PRIORITY_ICONS[item.priority]} ${item.title}`);
    }
  }

  console.log();
  console.log(kleur.dim(`  ${"─".repeat(40)}`));

  const counts: Record<TestPriority, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const s of suggestions) counts[s.priority]++;
  console.log(
    `  ${kleur.bold("Total:")} ${suggestions.length} tests (${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low)`,
  );
}

export async function analyze(url: string, outputPath?: string): Promise<void> {
  console.log();
  console.log(
    kleur.bold().cyan("  🧠 othello analyze"),
    kleur.dim("— generate a test plan from a live page"),
  );
  console.log();

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    console.log(kleur.red(`  ✗ Invalid URL: ${url}`));
    process.exit(1);
  }

  // Launch browser
  const s1 = spinner(`Analyzing ${parsedUrl.href}...`);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    s1.stop(kleur.red("✗ Failed to launch browser. Run: npx playwright install chromium"));
    process.exit(1);
  }

  try {
    const page = await browser.newPage();

    try {
      await page.goto(parsedUrl.href, { timeout: 30_000, waitUntil: "networkidle" });
    } catch {
      s1.stop(kleur.red(`✗ Failed to load ${parsedUrl.href} (timeout or unreachable)`));
      process.exit(1);
    }

    // Collect elements
    const analysis = await collectElements(page, parsedUrl.href);
    const inputCount = analysis.forms.reduce((sum, f) => sum + f.inputs.length, 0) + analysis.standaloneInputs.length;
    const selectCount = analysis.forms.reduce((sum, f) => sum + f.selects.length, 0) + analysis.selects.length;
    const submitCount = [...analysis.forms.flatMap((f) => f.buttons), ...analysis.buttons].filter((b) => b.type === "submit").length;

    s1.stop(
      kleur.green(`✓ Found: ${inputCount} inputs, ${selectCount} selects, ${submitCount} submit buttons`),
    );

    // Run rules
    const suggestions = runRules(analysis);

    if (suggestions.length === 0) {
      console.log(kleur.yellow("\n  ⚠ No test suggestions generated for this page.\n"));
      return;
    }

    // Print test plan
    printTestPlan(analysis.title || "Untitled", suggestions);

    // Generate spec file
    const spec = generateSpec(parsedUrl.href, analysis.title, suggestions, outputPath);
    fs.writeFileSync(spec.outputPath, spec.content);
    console.log(`  ${kleur.green("✓")} Generated: ${kleur.cyan(spec.outputPath)}`);
    console.log();
  } finally {
    await browser.close();
  }
}
