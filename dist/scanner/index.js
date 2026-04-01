"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scan = scan;
const fs = __importStar(require("node:fs"));
const playwright_1 = require("playwright");
const kleur_1 = __importDefault(require("kleur"));
const page_analyzer_1 = require("./page-analyzer");
const locator_ranker_1 = require("./locator-ranker");
const page_generator_1 = require("./page-generator");
const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
function spinner(message) {
    let i = 0;
    const id = setInterval(() => {
        process.stdout.write(`\r  ${kleur_1.default.cyan(FRAMES[i++ % FRAMES.length])} ${message}`);
    }, 80);
    return {
        stop(result) {
            clearInterval(id);
            process.stdout.write(`\r  ${result}\n`);
        },
    };
}
function printResultsTable(locators) {
    console.log();
    console.log(kleur_1.default.bold("  Scan results:\n"));
    // Column widths
    const nameW = Math.max(12, ...locators.map((l) => l.variableName.length)) + 2;
    const stratW = Math.max(10, ...locators.map((l) => l.strategy.length)) + 2;
    // Header
    const header = `  ${kleur_1.default.bold("Element".padEnd(nameW))}` +
        `${kleur_1.default.bold("Strategy".padEnd(stratW))}`;
    console.log(header);
    console.log(kleur_1.default.dim(`  ${"─".repeat(nameW + stratW)}`));
    // Rows
    for (const loc of locators) {
        const name = loc.variableName.padEnd(nameW);
        const stratColor = loc.strategy.includes("TestId") || loc.strategy.includes("#id")
            ? kleur_1.default.green
            : loc.strategy.includes("Role") || loc.strategy.includes("Label")
                ? kleur_1.default.yellow
                : kleur_1.default.red;
        console.log(`  ${name}${stratColor(loc.strategy.padEnd(stratW))}`);
    }
    console.log();
}
async function scan(url, testIdAttr) {
    console.log();
    console.log(kleur_1.default.bold().cyan("  🔍 create-prologue scan"), kleur_1.default.dim("— analyze page & generate Page Object"));
    console.log();
    // Validate URL
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    }
    catch {
        console.log(kleur_1.default.red(`  ✗ Invalid URL: ${url}`));
        process.exit(1);
    }
    // Launch browser
    const s1 = spinner(`Opening ${parsedUrl.href}...`);
    let browser;
    try {
        browser = await playwright_1.chromium.launch({ headless: true });
    }
    catch {
        s1.stop(kleur_1.default.red("✗ Failed to launch browser. Run: npx playwright install chromium"));
        process.exit(1);
    }
    try {
        const page = await browser.newPage();
        try {
            await page.goto(parsedUrl.href, { timeout: 30_000, waitUntil: "networkidle" });
        }
        catch {
            s1.stop(kleur_1.default.red(`✗ Failed to load ${parsedUrl.href} (timeout or unreachable)`));
            process.exit(1);
        }
        const pageTitle = await page.title();
        s1.stop(kleur_1.default.green(`✓ Page loaded — "${pageTitle}"`));
        // Analyze
        const s2 = spinner("Scanning interactive elements...");
        const elements = await (0, page_analyzer_1.analyzeElements)(page, testIdAttr);
        s2.stop(kleur_1.default.green(`✓ Found ${elements.length} interactive elements`));
        if (elements.length === 0) {
            console.log(kleur_1.default.yellow("\n  ⚠ No interactive elements found on this page.\n"));
            return;
        }
        // Rank
        const locators = elements.map((el) => (0, locator_ranker_1.rankLocator)(el));
        // Display table
        printResultsTable(locators);
        // Generate Page Object
        const s3 = spinner("Generating Page Object...");
        const { content, outputPath } = (0, page_generator_1.generatePageObject)(url, pageTitle, locators);
        fs.writeFileSync(outputPath, content);
        s3.stop(kleur_1.default.green(`✓ Page Object generated`));
        console.log(`\n  ${kleur_1.default.bold("File:")} ${kleur_1.default.cyan(outputPath)}`);
        // Summary
        const stable = locators.filter((l) => l.strategy === "getByTestId" || l.strategy === "locator#id").length;
        const total = locators.length;
        const pct = Math.round((stable / total) * 100);
        const pctColor = pct >= 75 ? kleur_1.default.green : pct >= 50 ? kleur_1.default.yellow : kleur_1.default.red;
        console.log(`  ${kleur_1.default.bold("Stable locators:")} ${pctColor(`${stable}/${total} (${pct}%)`)}`);
        if (pct < 75) {
            console.log(kleur_1.default.dim("\n  Tip: Add data-testid attributes to improve locator stability."));
        }
        console.log();
    }
    finally {
        await browser.close();
    }
}
