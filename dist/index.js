#!/usr/bin/env node
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
const node_child_process_1 = require("node:child_process");
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const kleur_1 = __importDefault(require("kleur"));
const prompts_1 = __importDefault(require("prompts"));
const analyzer_1 = require("./analyzer");
const scanner_1 = require("./scanner");
const TEMPLATES_DIR = path.join(__dirname, "..", "templates");
const DOCS_DIR = path.join(__dirname, "..", "docs");
// ──────────────────────────────────────────────
//  Spinner
// ──────────────────────────────────────────────
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
function run(cmd, cwd) {
    (0, node_child_process_1.execSync)(cmd, {
        cwd,
        stdio: "pipe",
        env: { ...process.env, FORCE_COLOR: "0" },
    });
}
// ──────────────────────────────────────────────
//  Main
// ──────────────────────────────────────────────
function printUsage() {
    console.log();
    console.log(kleur_1.default.bold().cyan("  ⚡ othello"), kleur_1.default.dim("— Playwright testing toolkit"));
    console.log();
    console.log(kleur_1.default.bold("  Commands:\n"));
    console.log("    othello create               Scaffold a new Playwright project");
    console.log("    othello scan <url>           Analyze a page and generate a Page Object");
    console.log("    othello analyze <url>        Generate a test plan from a live page");
    console.log();
    console.log(kleur_1.default.bold("  Options:\n"));
    console.log("    scan --test-id-attr <attr>   Custom test ID attribute (default: data-testid)");
    console.log("    analyze --output <path>      Custom output path for generated spec");
    console.log();
    console.log(kleur_1.default.bold("  Examples:\n"));
    console.log(kleur_1.default.dim("    npx othello create"));
    console.log(kleur_1.default.dim("    npx othello scan https://myapp.com/login"));
    console.log(kleur_1.default.dim("    npx othello scan https://myapp.com/login --test-id-attr data-cy"));
    console.log(kleur_1.default.dim("    npx othello analyze https://myapp.com/contact"));
    console.log();
}
async function main() {
    const args = process.argv.slice(2);
    // ── Subcommand: analyze ──
    if (args[0] === "analyze") {
        const url = args[1];
        if (!url) {
            console.log(kleur_1.default.red("\n  Usage: othello analyze <url> [--output <path>]"));
            console.log(kleur_1.default.dim("  Example: othello analyze https://example.com/contact\n"));
            process.exit(1);
        }
        const outputIdx = args.indexOf("--output");
        const outputIdxShort = args.indexOf("-o");
        const oIdx = outputIdx >= 0 ? outputIdx : outputIdxShort;
        const outputPath = oIdx >= 0 ? args[oIdx + 1] : undefined;
        await (0, analyzer_1.analyze)(url, outputPath);
        return;
    }
    // ── Subcommand: scan ──
    if (args[0] === "scan") {
        const url = args[1];
        if (!url) {
            console.log(kleur_1.default.red("\n  Usage: othello scan <url>"));
            console.log(kleur_1.default.dim("  Example: othello scan https://example.com/contact\n"));
            process.exit(1);
        }
        const testIdAttr = args.includes("--test-id-attr")
            ? args[args.indexOf("--test-id-attr") + 1] || "data-testid"
            : "data-testid";
        await (0, scanner_1.scan)(url, testIdAttr);
        return;
    }
    // ── Subcommand: create ──
    if (args[0] === "create" || args.length === 0) {
        if (args[0] !== "create" && args.length === 0) {
            // No args at all — show help
            printUsage();
            return;
        }
    }
    else {
        // Unknown subcommand
        console.log(kleur_1.default.red(`\n  Unknown command: ${args[0]}`));
        printUsage();
        process.exit(1);
    }
    // ── Scaffold ──
    console.log();
    console.log(kleur_1.default.bold().cyan("  ⚡ othello create"), kleur_1.default.dim("— scaffold a production-grade Playwright project"));
    console.log();
    const response = await (0, prompts_1.default)([
        {
            type: "text",
            name: "projectName",
            message: "Project name",
            initial: "e2e-tests",
            validate: (v) => /^[a-z0-9-]+$/.test(v) ? true : "Use lowercase letters, numbers, and hyphens only",
        },
        {
            type: "text",
            name: "baseUrl",
            message: "Application base URL",
            initial: "https://practicesoftwaretesting.com",
        },
        {
            type: "confirm",
            name: "includeExamples",
            message: "Include example files? (Contact page, test & builder for practicesoftwaretesting.com)",
            initial: true,
        },
        {
            type: "confirm",
            name: "includeFaker",
            message: "Install Faker.js? (generates realistic random test data — names, emails, etc.)",
            initial: true,
        },
        {
            type: "confirm",
            name: "includeVisual",
            message: "Include visual regression tests?",
            initial: true,
        },
        {
            type: "confirm",
            name: "includeApi",
            message: "Include API helpers for setup/teardown?",
            initial: true,
        },
        {
            type: "confirm",
            name: "includeCi",
            message: "Include GitHub Actions CI/CD?",
            initial: true,
        },
    ], { onCancel: () => process.exit(1) });
    const config = response;
    const targetDir = path.resolve(process.cwd(), config.projectName);
    if (fs.existsSync(targetDir)) {
        console.log(kleur_1.default.red(`\n  ✗ Directory "${config.projectName}" already exists.\n`));
        process.exit(1);
    }
    console.log();
    // ── Step 1: Scaffold files ──
    const s1 = spinner("Scaffolding project structure...");
    try {
        copyDir(TEMPLATES_DIR, targetDir, config);
        const tmplPath = path.join(targetDir, "package.json.tmpl");
        const pkgPath = path.join(targetDir, "package.json");
        if (fs.existsSync(tmplPath)) {
            fs.renameSync(tmplPath, pkgPath);
        }
        // Add Faker.js to package.json if requested
        if (config.includeFaker) {
            const pkgContent = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
            pkgContent.devDependencies["@faker-js/faker"] = "^9.0.0";
            fs.writeFileSync(pkgPath, JSON.stringify(pkgContent, null, 2) + "\n");
        }
        // Remove example files if not requested
        if (!config.includeExamples) {
            removeFile(path.join(targetDir, "src", "pages", "contact.page.ts"));
            removeFile(path.join(targetDir, "src", "data", "builders", "contact.builder.ts"));
            removeFile(path.join(targetDir, "tests", "e2e", "contact.spec.ts"));
            // Reset fixtures to an empty shell without ContactPage
            const fixturesPath = path.join(targetDir, "src", "fixtures", "index.ts");
            fs.writeFileSync(fixturesPath, [
                'import { test as base } from "@playwright/test";',
                "",
                "/**",
                " * Custom test fixtures extending Playwright's base test.",
                " *",
                " * Add your Page Objects here:",
                " * 1. Import your page class",
                " * 2. Add it to TestFixtures",
                " * 3. Add the fixture definition in base.extend()",
                " */",
                "",
                "type TestFixtures = {",
                "  // myPage: MyPage;",
                "};",
                "",
                "export const test = base.extend<TestFixtures>({",
                "  // myPage: async ({ page }, use) => {",
                "  //   await use(new MyPage(page));",
                "  // },",
                "});",
                "",
                'export { expect } from "../utils/custom-matchers";',
                "",
            ].join("\n"));
            // Strip ContactFormData from types if no examples
            const typesPath = path.join(targetDir, "src", "data", "types", "index.ts");
            let typesContent = fs.readFileSync(typesPath, "utf-8");
            typesContent = typesContent.replace(/\/\/ Contact dropdown.*?\n/s, "");
            typesContent = typesContent.replace(/export type ContactSubject[\s\S]*?;\n\n/m, "");
            typesContent = typesContent.replace(/export interface ContactFormData[\s\S]*?}\n\n/m, "");
            fs.writeFileSync(typesPath, typesContent);
        }
        // Remove Faker-dependent builder if Faker not included but examples are
        if (!config.includeFaker && config.includeExamples) {
            removeFile(path.join(targetDir, "src", "data", "builders", "contact.builder.ts"));
        }
        if (!config.includeVisual) {
            removeDir(path.join(targetDir, "tests", "visual"));
            removeFile(path.join(targetDir, "src", "utils", "visual.ts"));
        }
        if (!config.includeApi) {
            removeDir(path.join(targetDir, "src", "api"));
        }
        if (!config.includeCi) {
            removeDir(path.join(targetDir, ".github"));
        }
        copyDir(DOCS_DIR, path.join(targetDir, "docs"), config);
        fs.mkdirSync(path.join(targetDir, "auth"), { recursive: true });
        fs.mkdirSync(path.join(targetDir, "reports"), { recursive: true });
        fs.mkdirSync(path.join(targetDir, "screenshots"), { recursive: true });
        const envExample = path.join(targetDir, ".env.example");
        const envFile = path.join(targetDir, ".env");
        if (fs.existsSync(envExample)) {
            fs.copyFileSync(envExample, envFile);
        }
        const fileCount = countFiles(targetDir);
        s1.stop(kleur_1.default.green(`✓ Scaffolded ${fileCount} files`));
    }
    catch (err) {
        s1.stop(kleur_1.default.red("✗ Scaffold failed"));
        throw err;
    }
    // ── Step 2: npm install ──
    const s2 = spinner("Installing dependencies (npm install)...");
    try {
        run("npm install", targetDir);
        s2.stop(kleur_1.default.green("✓ Dependencies installed"));
    }
    catch (err) {
        s2.stop(kleur_1.default.red("✗ npm install failed"));
        console.log(kleur_1.default.dim("\n  You can retry manually:"));
        console.log(`    cd ${config.projectName}`);
        console.log("    npm install\n");
        throw err;
    }
    // ── Step 3: Playwright browsers ──
    const s3 = spinner("Installing Playwright browsers (this may take a minute)...");
    try {
        run("npx playwright install --with-deps chromium", targetDir);
        s3.stop(kleur_1.default.green("✓ Playwright browsers installed"));
    }
    catch (err) {
        s3.stop(kleur_1.default.yellow("⚠ Playwright install failed (you can retry manually)"));
        console.log(kleur_1.default.dim(`    cd ${config.projectName}`));
        console.log(kleur_1.default.dim("    npx playwright install --with-deps chromium\n"));
    }
    // ── Step 4: Git init (before lint — biome needs a git repo for vcs config) ──
    const s4 = spinner("Initializing git repository...");
    try {
        run("git init", targetDir);
        s4.stop(kleur_1.default.green("✓ Git repository initialized"));
    }
    catch {
        s4.stop(kleur_1.default.yellow("⚠ Git init skipped (git not available)"));
    }
    // ── Step 5: Lint check ──
    const s5 = spinner("Verifying code quality (biome check)...");
    try {
        run("npx @biomejs/biome check .", targetDir);
        s5.stop(kleur_1.default.green("✓ All files pass lint & format"));
    }
    catch {
        s5.stop(kleur_1.default.yellow("⚠ Some lint issues found (run npm run lint:fix)"));
    }
    // ── Step 6: Git commit ──
    const s6 = spinner("Creating initial commit...");
    try {
        run("git add -A", targetDir);
        run('git commit -m "Initial scaffold via othello"', targetDir);
        s6.stop(kleur_1.default.green("✓ Initial commit created"));
    }
    catch {
        s6.stop(kleur_1.default.yellow("⚠ Git commit skipped"));
    }
    // ── Done ──
    console.log();
    console.log(kleur_1.default.bold().green("  ✓ Project ready!\n"));
    console.log(kleur_1.default.bold("  Get started:\n"));
    console.log(`    cd ${config.projectName}`);
    console.log("    code .                    # open in VS Code");
    console.log("");
    console.log(kleur_1.default.bold("  Run tests:\n"));
    console.log("    npm test                  # all tests");
    console.log("    npm run test:smoke        # smoke tests only");
    console.log("    npm run test:ui           # Playwright UI mode");
    console.log("    npm run test:debug        # step-by-step debugger");
    console.log("");
    console.log(kleur_1.default.bold("  Code quality:\n"));
    console.log("    npm run lint              # check with Biome");
    console.log("    npm run lint:fix          # auto-fix issues");
    console.log("");
    if (config.includeExamples) {
        console.log(kleur_1.default.bold("  Example tests included:\n"));
        console.log(kleur_1.default.dim("    The project includes a Contact page example based on"));
        console.log(kleur_1.default.dim("    https://practicesoftwaretesting.com — run them to see"));
        console.log(kleur_1.default.dim("    the framework in action.\n"));
    }
    if (config.includeFaker) {
        console.log(kleur_1.default.bold("  Faker.js installed:\n"));
        console.log(kleur_1.default.dim("    Use it in your data builders to generate realistic"));
        console.log(kleur_1.default.dim("    test data (names, emails, addresses, etc.).\n"));
    }
    printStructure(config);
}
// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────
function copyDir(src, dest, config) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath, config);
        }
        else {
            let content = fs.readFileSync(srcPath, "utf-8");
            content = content.replace(/\{\{projectName\}\}/g, config.projectName);
            content = content.replace(/https:\/\/practicesoftwaretesting\.com/g, config.baseUrl);
            fs.writeFileSync(destPath, content);
        }
    }
}
function removeDir(dirPath) {
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true });
    }
}
function removeFile(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}
function countFiles(dir) {
    let count = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules")
            continue;
        if (entry.isDirectory()) {
            count += countFiles(path.join(dir, entry.name));
        }
        else {
            count++;
        }
    }
    return count;
}
function printStructure(config) {
    console.log(kleur_1.default.dim("  Project structure:\n"));
    const lines = [
        "  src/",
        "  ├── core/            Base classes (BasePage, BaseComponent, BaseAPI)",
        "  ├── components/      Reusable UI components (Table, Modal, Form...)",
        config.includeExamples
            ? "  ├── pages/           Page Objects (Contact example included)"
            : "  ├── pages/           Page Objects (one per page)",
        "  ├── fixtures/        Playwright fixture injection",
        config.includeApi ? "  ├── api/             API clients for setup/teardown" : null,
        "  ├── data/            Builders & types for test data",
        "  ├── config/          Environment & user configuration",
        "  ├── reporters/       Custom HTML reporter",
        "  └── utils/           Logger, custom matchers, visual helpers",
        "  tests/",
        config.includeExamples
            ? "  ├── e2e/             End-to-end specs (Contact example included)"
            : "  ├── e2e/             End-to-end specs",
        config.includeVisual ? "  └── visual/          Visual regression specs" : null,
    ].filter(Boolean);
    for (const line of lines) {
        console.log(line);
    }
    console.log();
}
main().catch(console.error);
