import * as fs from "node:fs";
import * as readline from "node:readline";
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

function printResultsTable(locators: RankedLocator[]): void {
  console.log();
  console.log(kleur.bold("  Scan results:\n"));

  // Column widths
  const nameW = Math.max(12, ...locators.map((l) => l.variableName.length)) + 2;
  const stratW = Math.max(10, ...locators.map((l) => l.strategy.length)) + 2;

  // Header
  const header =
    `  ${kleur.bold("Element".padEnd(nameW))}` +
    `${kleur.bold("Strategy".padEnd(stratW))}`;
  console.log(header);
  console.log(kleur.dim(`  ${"─".repeat(nameW + stratW)}`));

  // Rows
  for (const loc of locators) {
    const name = loc.variableName.padEnd(nameW);
    const stratColor = loc.strategy.includes("TestId") || loc.strategy.includes("#id")
      ? kleur.green
      : loc.strategy.includes("Role") || loc.strategy.includes("Label")
        ? kleur.yellow
        : kleur.red;
    console.log(`  ${name}${stratColor(loc.strategy.padEnd(stratW))}`);
  }

  console.log();
}

interface ScanOptions {
  headed?: boolean;
  authFile?: string;
}

export async function scan(url: string, testIdAttr: string, options: ScanOptions = {}): Promise<void> {
  console.log();
  console.log(
    kleur.bold().cyan("  🔍 histrion scan"),
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

  // Validate auth file
  if (options.authFile) {
    if (!fs.existsSync(options.authFile)) {
      console.log(kleur.red(`  ✗ Auth file not found: ${options.authFile}`));
      process.exit(1);
    }
    try {
      JSON.parse(fs.readFileSync(options.authFile, "utf-8"));
    } catch {
      console.log(kleur.red(`  ✗ Invalid auth file: ${options.authFile} (expected Playwright storage state)`));
      process.exit(1);
    }
  }

  // Launch browser
  const s1 = spinner(`Opening ${parsedUrl.href}...`);
  let browser;
  try {
    browser = await chromium.launch({ headless: !options.headed });
  } catch {
    s1.stop(kleur.red("✗ Failed to launch browser. Run: npx playwright install chromium"));
    process.exit(1);
  }

  try {
    const context = options.authFile
      ? await browser.newContext({ storageState: options.authFile })
      : await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(parsedUrl.href, { timeout: 30_000, waitUntil: "networkidle" });
    } catch {
      s1.stop(kleur.red(`✗ Failed to load ${parsedUrl.href} (timeout or unreachable)`));
      process.exit(1);
    }

    const pageTitle = await page.title();
    s1.stop(kleur.green(`✓ Page loaded — "${pageTitle}"`));

    // In headed mode, let the user navigate and log in manually
    if (options.headed) {
      console.log();
      console.log(kleur.dim("  Browser is open. Log in, navigate to the target page,"));
      console.log(kleur.dim("  then press Enter here to scan.\n"));

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      await new Promise<void>((resolve) => rl.question("  Press Enter to scan...", () => { rl.close(); resolve(); }));

      // Show what we're actually scanning
      const scanUrl = page.url();
      const scanTitle = await page.title();
      console.log();
      console.log(kleur.bold(`  Scanning: ${scanUrl} — "${scanTitle}"`));
    }

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
    const stable = locators.filter((l) => l.strategy === "getByTestId" || l.strategy === "locator#id").length;
    const total = locators.length;
    const pct = Math.round((stable / total) * 100);
    const pctColor = pct >= 75 ? kleur.green : pct >= 50 ? kleur.yellow : kleur.red;
    console.log(`  ${kleur.bold("Stable locators:")} ${pctColor(`${stable}/${total} (${pct}%)`)}`);

    if (pct < 75) {
      console.log(
        kleur.dim("\n  Tip: Add data-testid attributes to improve locator stability."),
      );
    }

    console.log();
  } finally {
    await browser.close();
  }
}
