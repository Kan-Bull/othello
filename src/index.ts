#!/usr/bin/env node

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import kleur from "kleur";
import prompts from "prompts";
import { scan } from "./scanner";

const TEMPLATES_DIR = path.join(__dirname, "..", "templates");
const DOCS_DIR = path.join(__dirname, "..", "docs");
const AI_INSTRUCTIONS_DIR = path.join(__dirname, "..", "resources");

const AI_TOOLS = [
  { key: "copilot", title: "GitHub Copilot", file: path.join(".github", "copilot-instructions.md") },
  { key: "claude", title: "Claude Code", file: "CLAUDE.md" },
  { key: "cursor", title: "Cursor", file: ".cursorrules" },
  { key: "windsurf", title: "Windsurf", file: ".windsurfrules" },
] as const;

interface ProjectConfig {
  projectName: string;
  baseUrl: string;
  includeExamples: boolean;
  includeFaker: boolean;
  includeVisual: boolean;
  includeApi: boolean;
  includeCi: boolean;
  aiInstructions: string[];
}

// ──────────────────────────────────────────────
//  Spinner
// ──────────────────────────────────────────────

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

function run(cmd: string, cwd: string): void {
  execSync(cmd, {
    cwd,
    stdio: "pipe",
    env: { ...process.env, FORCE_COLOR: "0" },
  });
}

// ──────────────────────────────────────────────
//  Main
// ──────────────────────────────────────────────

function printUsage(): void {
  console.log();
  console.log(kleur.bold().cyan("  ⚡ histrion"), kleur.dim("— Playwright testing toolkit"));
  console.log();
  console.log(kleur.bold("  Commands:\n"));
  console.log("    histrion create [name|.]       Scaffold a new Playwright project");
  console.log("    histrion scan <url>           Analyze a page and generate a Page Object");
  console.log();
  console.log(kleur.bold("  Options:\n"));
  console.log("    scan --test-id-attr <attr>   Custom test ID attribute (default: data-testid)");
  console.log();
  console.log(kleur.bold("  Examples:\n"));
  console.log(kleur.dim("    npx histrion create"));
  console.log(kleur.dim("    npx histrion create my-e2e-tests"));
  console.log(kleur.dim("    npx histrion create .              # scaffold in current directory"));
  console.log(kleur.dim("    npx histrion scan https://myapp.com/login"));
  console.log(kleur.dim("    npx histrion scan https://myapp.com/login --test-id-attr data-cy"));
  console.log();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // ── Subcommand: scan ──
  if (args[0] === "scan") {
    const url = args[1];
    if (!url) {
      console.log(kleur.red("\n  Usage: histrion scan <url>"));
      console.log(kleur.dim("  Example: histrion scan https://example.com/contact\n"));
      process.exit(1);
    }
    const testIdAttr = args.includes("--test-id-attr")
      ? args[args.indexOf("--test-id-attr") + 1] || "data-testid"
      : "data-testid";
    const headed = args.includes("--headed");
    const authFile = args.includes("--auth")
      ? args[args.indexOf("--auth") + 1]
      : undefined;
    await scan(url, testIdAttr, { headed, authFile });
    return;
  }

  // ── Subcommand: create ──
  if (args[0] === "create" || args.length === 0) {
    if (args[0] !== "create" && args.length === 0) {
      // No args at all — show help
      printUsage();
      return;
    }
  } else {
    // Unknown subcommand
    console.log(kleur.red(`\n  Unknown command: ${args[0]}`));
    printUsage();
    process.exit(1);
  }

  // ── Scaffold ──
  const inlineArg = args[1];
  const scaffoldInPlace = inlineArg === ".";
  const inlineName = inlineArg && !inlineArg.startsWith("-") ? inlineArg : undefined;

  console.log();
  console.log(
    kleur.bold().cyan("  ⚡ histrion create"),
    kleur.dim("— scaffold a production-grade Playwright project"),
  );
  console.log();

  const response = await prompts(
    [
      {
        type: inlineName ? null : "text",
        name: "projectName",
        message: "Project name",
        initial: "e2e-tests",
        validate: (v: string) =>
          /^[a-z0-9-.]+$/.test(v) ? true : "Use lowercase letters, numbers, hyphens, and dots only",
      },
      {
        type: "text",
        name: "baseUrl",
        message: "Application base URL",
        initial: "https://your-app.com",
      },
      {
        type: "confirm",
        name: "includeExamples",
        message: "Include starter template files? (Page Object, fixture & test boilerplate to get started)",
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
      {
        type: "multiselect",
        name: "aiInstructions",
        message: "AI coding assistant instructions?",
        choices: AI_TOOLS.map((t) => ({ title: t.title, value: t.key })),
        hint: "— space to select, enter to confirm",
      },
    ],
    { onCancel: () => process.exit(1) },
  );

  const config = response as ProjectConfig;

  if (scaffoldInPlace) {
    config.projectName = path.basename(process.cwd());
  } else if (inlineName) {
    config.projectName = inlineName;
  }

  const targetDir = scaffoldInPlace
    ? process.cwd()
    : path.resolve(process.cwd(), config.projectName);

  if (!scaffoldInPlace && fs.existsSync(targetDir)) {
    console.log(kleur.red(`\n  ✗ Directory "${config.projectName}" already exists.\n`));
    process.exit(1);
  }

  if (scaffoldInPlace) {
    const entries = fs.readdirSync(targetDir).filter((e) => e !== ".git");
    if (entries.length > 0) {
      console.log(kleur.red(`\n  ✗ Current directory is not empty.\n`));
      process.exit(1);
    }
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

    // npm strips .gitignore from published packages, so we ship it as gitignore.tmpl
    const giTmpl = path.join(targetDir, "gitignore.tmpl");
    if (fs.existsSync(giTmpl)) {
      fs.renameSync(giTmpl, path.join(targetDir, ".gitignore"));
    }

    // Add Faker.js to package.json if requested
    if (config.includeFaker) {
      const pkgContent = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      pkgContent.devDependencies["@faker-js/faker"] = "^9.0.0";
      fs.writeFileSync(pkgPath, JSON.stringify(pkgContent, null, 2) + "\n");
    }

    // Remove starter template files if not requested
    if (!config.includeExamples) {
      removeFile(path.join(targetDir, "src", "pages", "example.page.ts"));
      removeFile(path.join(targetDir, "src", "data", "types", "example.ts"));
      removeFile(path.join(targetDir, "tests", "e2e", "example.spec.ts"));

      // Reset fixtures to an empty shell
      const fixturesPath = path.join(targetDir, "src", "fixtures", "index.ts");
      fs.writeFileSync(
        fixturesPath,
        [
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
        ].join("\n"),
      );

      // Strip ExampleData re-export from types
      const typesPath = path.join(targetDir, "src", "data", "types", "index.ts");
      let typesContent = fs.readFileSync(typesPath, "utf-8");
      typesContent = typesContent.replace(/export type \{ ExampleData \}.*\n\n?/m, "");
      fs.writeFileSync(typesPath, typesContent);
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

    // Write AI coding assistant instructions
    if (config.aiInstructions.length > 0) {
      const aiTemplatePath = path.join(AI_INSTRUCTIONS_DIR, "ai-instructions.md");
      let aiContent = fs.readFileSync(aiTemplatePath, "utf-8");
      aiContent = aiContent.replace(/\{\{projectName\}\}/g, config.projectName);

      for (const tool of config.aiInstructions) {
        const entry = AI_TOOLS.find((t) => t.key === tool);
        if (entry) {
          const fullPath = path.join(targetDir, entry.file);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, aiContent);
        }
      }
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
    s1.stop(kleur.green(`✓ Scaffolded ${fileCount} files`));
  } catch (err) {
    s1.stop(kleur.red("✗ Scaffold failed"));
    throw err;
  }

  // ── Step 2: npm install ──
  const s2 = spinner("Installing dependencies (npm install)...");
  try {
    run("npm install", targetDir);
    s2.stop(kleur.green("✓ Dependencies installed"));
  } catch (err) {
    s2.stop(kleur.red("✗ npm install failed"));
    console.log(kleur.dim("\n  You can retry manually:"));
    console.log(`    cd ${config.projectName}`);
    console.log("    npm install\n");
    throw err;
  }

  // ── Step 3: Playwright browsers ──
  const s3 = spinner("Installing Playwright browsers (this may take a minute)...");
  try {
    run("npx playwright install --with-deps chromium", targetDir);
    s3.stop(kleur.green("✓ Playwright browsers installed"));
  } catch (err) {
    s3.stop(kleur.yellow("⚠ Playwright install failed (you can retry manually)"));
    console.log(kleur.dim(`    cd ${config.projectName}`));
    console.log(kleur.dim("    npx playwright install --with-deps chromium\n"));
  }

  // ── Step 4: Git init (before lint — biome needs a git repo for vcs config) ──
  const s4 = spinner("Initializing git repository...");
  try {
    run("git init", targetDir);
    s4.stop(kleur.green("✓ Git repository initialized"));
  } catch {
    s4.stop(kleur.yellow("⚠ Git init skipped (git not available)"));
  }

  // ── Step 5: Lint check ──
  const s5 = spinner("Verifying code quality (biome check)...");
  try {
    run("npx @biomejs/biome check .", targetDir);
    s5.stop(kleur.green("✓ All files pass lint & format"));
  } catch {
    s5.stop(kleur.yellow("⚠ Some lint issues found (run npm run lint:fix)"));
  }

  // ── Step 6: Git commit ──
  const s6 = spinner("Creating initial commit...");
  try {
    run("git add -A", targetDir);
    run('git commit -m "Initial scaffold via histrion"', targetDir);
    s6.stop(kleur.green("✓ Initial commit created"));
  } catch {
    s6.stop(kleur.yellow("⚠ Git commit skipped"));
  }

  // ── Done ──
  console.log();
  console.log(kleur.bold().green("  ✓ Project ready!\n"));

  console.log(kleur.bold("  Get started:\n"));
  console.log(`    cd ${config.projectName}`);
  console.log("    code .                    # open in VS Code");
  console.log("");
  console.log(kleur.bold("  Run tests:\n"));
  console.log("    npm test                  # all tests");
  console.log("    npm run test:smoke        # smoke tests only");
  console.log("    npm run test:ui           # Playwright UI mode");
  console.log("    npm run test:debug        # step-by-step debugger");
  console.log("");
  console.log(kleur.bold("  Code quality:\n"));
  console.log("    npm run lint              # check with Biome");
  console.log("    npm run lint:fix          # auto-fix issues");
  console.log("");

  if (config.includeExamples) {
    console.log(kleur.bold("  Starter templates included:\n"));
    console.log(
      kleur.dim("    The project includes Page Object, fixture & test"),
    );
    console.log(
      kleur.dim("    boilerplate in src/pages/example.page.ts — open it"),
    );
    console.log(kleur.dim("    and follow docs/15-writing-your-first-test.md.\n"));
  }

  if (config.includeFaker) {
    console.log(kleur.bold("  Faker.js installed:\n"));
    console.log(
      kleur.dim("    Use it in your data builders to generate realistic"),
    );
    console.log(
      kleur.dim("    test data (names, emails, addresses, etc.).\n"),
    );
  }

  if (config.aiInstructions.length > 0) {
    const names = config.aiInstructions
      .map((t) => AI_TOOLS.find((a) => a.key === t)?.title || t)
      .join(", ");
    console.log(kleur.bold("  AI instructions included:\n"));
    console.log(
      kleur.dim(`    Generated for: ${names}`),
    );
    console.log(
      kleur.dim("    Your AI assistant will follow the project's POM architecture.\n"),
    );
  }

  printStructure(config);
}

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

function copyDir(src: string, dest: string, config: ProjectConfig): void {
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, config);
    } else {
      let content = fs.readFileSync(srcPath, "utf-8");
      content = content.replace(/\{\{projectName\}\}/g, config.projectName);
      content = content.replace(
        /https:\/\/your-app\.com/g,
        config.baseUrl,
      );
      fs.writeFileSync(destPath, content);
    }
  }
}

function removeDir(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true });
  }
}

function removeFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function countFiles(dir: string): number {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    if (entry.isDirectory()) {
      count += countFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
}

function printStructure(config: ProjectConfig): void {
  console.log(kleur.dim("  Project structure:\n"));
  const lines = [
    "  src/",
    "  ├── core/            Base classes (BasePage, BaseComponent, BaseAPI)",
    "  ├── components/      Reusable UI components (Table, Modal, Form...)",
    config.includeExamples
      ? "  ├── pages/           Page Objects (starter template included)"
      : "  ├── pages/           Page Objects (one per page)",
    "  ├── fixtures/        Playwright fixture injection",
    config.includeApi ? "  ├── api/             API clients for setup/teardown" : null,
    "  ├── data/            Builders & types for test data",
    "  ├── config/          Environment & user configuration",
    "  ├── reporters/       Custom HTML reporter",
    "  └── utils/           Logger, custom matchers, visual helpers",
    "  tests/",
    config.includeExamples
      ? "  ├── e2e/             End-to-end specs (starter template included)"
      : "  ├── e2e/             End-to-end specs",
    config.includeVisual ? "  └── visual/          Visual regression specs" : null,
    config.aiInstructions.length > 0
      ? `  AI instructions:     ${config.aiInstructions.map((t) => AI_TOOLS.find((a) => a.key === t)?.file || t).join(", ")}`
      : null,
  ].filter(Boolean);

  for (const line of lines) {
    console.log(line);
  }
  console.log();
}

main().catch(console.error);
