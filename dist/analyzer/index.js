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
exports.analyze = analyze;
const fs = __importStar(require("node:fs"));
const playwright_1 = require("playwright");
const kleur_1 = __importDefault(require("kleur"));
const element_collector_1 = require("./element-collector");
const rule_engine_1 = require("./rule-engine");
const spec_generator_1 = require("./spec-generator");
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
const PRIORITY_ICONS = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "⚪",
};
const CATEGORY_ORDER = [
    "happy-path",
    "validation",
    "edge-case",
    "security",
    "ux",
    "accessibility",
];
const CATEGORY_LABELS = {
    "happy-path": "HAPPY PATH",
    validation: "VALIDATION",
    "edge-case": "EDGE CASES",
    security: "SECURITY",
    ux: "UX",
    accessibility: "ACCESSIBILITY",
};
function printTestPlan(pageTitle, suggestions) {
    console.log();
    console.log(kleur_1.default.bold(`  ═══ Test plan: ${pageTitle} ═══`));
    for (const category of CATEGORY_ORDER) {
        const items = suggestions.filter((s) => s.category === category);
        if (items.length === 0)
            continue;
        console.log();
        console.log(kleur_1.default.bold(`  ${CATEGORY_LABELS[category]} (${items.length} tests)`));
        for (const item of items) {
            console.log(`  ${PRIORITY_ICONS[item.priority]} ${item.title}`);
        }
    }
    console.log();
    console.log(kleur_1.default.dim(`  ${"─".repeat(40)}`));
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const s of suggestions)
        counts[s.priority]++;
    console.log(`  ${kleur_1.default.bold("Total:")} ${suggestions.length} tests (${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low)`);
}
async function analyze(url, outputPath) {
    console.log();
    console.log(kleur_1.default.bold().cyan("  🧠 othello analyze"), kleur_1.default.dim("— generate a test plan from a live page"));
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
    const s1 = spinner(`Analyzing ${parsedUrl.href}...`);
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
        // Collect elements
        const analysis = await (0, element_collector_1.collectElements)(page, parsedUrl.href);
        const inputCount = analysis.forms.reduce((sum, f) => sum + f.inputs.length, 0) + analysis.standaloneInputs.length;
        const selectCount = analysis.forms.reduce((sum, f) => sum + f.selects.length, 0) + analysis.selects.length;
        const submitCount = [...analysis.forms.flatMap((f) => f.buttons), ...analysis.buttons].filter((b) => b.type === "submit").length;
        s1.stop(kleur_1.default.green(`✓ Found: ${inputCount} inputs, ${selectCount} selects, ${submitCount} submit buttons`));
        // Run rules
        const suggestions = (0, rule_engine_1.runRules)(analysis);
        if (suggestions.length === 0) {
            console.log(kleur_1.default.yellow("\n  ⚠ No test suggestions generated for this page.\n"));
            return;
        }
        // Print test plan
        printTestPlan(analysis.title || "Untitled", suggestions);
        // Generate spec file
        const spec = (0, spec_generator_1.generateSpec)(parsedUrl.href, analysis.title, suggestions, outputPath);
        fs.writeFileSync(spec.outputPath, spec.content);
        console.log(`  ${kleur_1.default.green("✓")} Generated: ${kleur_1.default.cyan(spec.outputPath)}`);
        console.log();
    }
    finally {
        await browser.close();
    }
}
