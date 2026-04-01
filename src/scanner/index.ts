import * as fs from "node:fs";
import { chromium } from "playwright";
import kleur from "kleur";
import { analyzeElements } from "./page-analyzer";
import { rankLocator } from "./locator-ranker";
import type { RankedLocator } from "./locator-ranker";
import { generatePageObject } from "./page-generator";

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

function stars(score: number): string {
  const filled = kleur.yellow("★".repeat(score));
  const empty = kleur.dim("☆".repeat(5 - score));
  return filled + empty;
}

function printResultsTable(locators: RankedLocator[]): void {
  console.log();
  console.log(kleur.bold("  Scan results:\n"));

  // Column widths
  const nameW = Math.max(12, ...locators.map((l) => l.variableName.length)) + 2;
  const stratW = Math.max(10, ...locators.map((l) => l.strategy.length)) + 2;

  // Header
  const header =
    `  ${kleur.bold("Element".padEnd(nameW))}` +
    `${kleur.bold("Strategy".padEnd(stratW))}` +
    `${kleur.bold("Score")}`;
  console.log(header);
  console.log(kleur.dim(`  ${"─".repeat(nameW + stratW + 7)}`));

  // Rows
  for (const loc of locators) {
    const name = loc.variableName.padEnd(nameW);
    const strategy = loc.strategy.padEnd(stratW);
    console.log(`  ${name}${kleur.dim(strategy)}${stars(loc.score)}`);
  }

  console.log();
}

export async function scan(url: string, testIdAttr: string): Promise<void> {
  console.log();
  console.log(
    kleur.bold().cyan("  🔍 create-prologue scan"),
    kleur.dim("— analyze page & generate Page Object"),
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
  const s1 = spinner(`Opening ${parsedUrl.href}...`);
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

    const pageTitle = await page.title();
    s1.stop(kleur.green(`✓ Page loaded — "${pageTitle}"`));

    // Analyze
    const s2 = spinner("Scanning interactive elements...");
    const elements = await analyzeElements(page, testIdAttr);
    s2.stop(kleur.green(`✓ Found ${elements.length} interactive elements`));

    if (elements.length === 0) {
      console.log(kleur.yellow("\n  ⚠ No interactive elements found on this page.\n"));
      return;
    }

    // Rank
    const locators = elements.map((el) => rankLocator(el));

    // Display table
    printResultsTable(locators);

    // Generate Page Object
    const s3 = spinner("Generating Page Object...");
    const { content, outputPath } = generatePageObject(url, pageTitle, locators);
    fs.writeFileSync(outputPath, content);
    s3.stop(kleur.green(`✓ Page Object generated`));

    console.log(`\n  ${kleur.bold("File:")} ${kleur.cyan(outputPath)}`);

    // Summary
    const avg = locators.reduce((sum, l) => sum + l.score, 0) / locators.length;
    const scoreColor = avg >= 4 ? kleur.green : avg >= 2.5 ? kleur.yellow : kleur.red;
    console.log(`  ${kleur.bold("Average score:")} ${scoreColor(avg.toFixed(1) + "/5")}`);

    if (avg < 3) {
      console.log(
        kleur.dim("\n  Tip: Add aria-labels or data-testid attributes to improve locator quality."),
      );
    }

    console.log();
  } finally {
    await browser.close();
  }
}
