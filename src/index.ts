#!/usr/bin/env node

import { Command } from "commander";
import kleur from "kleur";
import { readClipboard } from "./utils/cli";
import { extract } from "./extractor";
import { scan } from "./scanner";
import { scaffold } from "./scaffold";

const pkg = require("../package.json");

const program = new Command()
  .name("histrion")
  .description("Playwright testing toolkit — scaffold projects and generate Page Objects")
  .version(pkg.version, "-v, --version");

// ── create ──
program
  .command("create [name]")
  .description("Scaffold a new Playwright project (use '.' for current directory)")
  .action(async (name?: string) => {
    await scaffold(name);
  });

// ── scan ──
program
  .command("scan <url>")
  .description("Analyze a page and generate a Page Object")
  .option("--test-id-attr <attr>", "Custom test ID attribute", "data-testid")
  .option("--headed", "Open browser visibly — log in, then press Enter to scan")
  .option("--auth <file>", "Use saved auth state (e.g. auth/admin.json)")
  .action(async (url: string, opts: { testIdAttr: string; headed?: boolean; auth?: string }) => {
    await scan(url, opts.testIdAttr, { headed: opts.headed, authFile: opts.auth });
  });

// ── extract ──
program
  .command("extract [html...]")
  .description("Extract locators from clipboard or inline HTML (Copy Element in DevTools)")
  .action(async (htmlParts: string[]) => {
    const htmlArg = htmlParts.join(" ");

    // Priority 1: inline argument
    if (htmlArg) {
      await extract(htmlArg);
      return;
    }

    // Priority 2: piped input
    if (!process.stdin.isTTY) {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      const piped = Buffer.concat(chunks).toString("utf-8").trim();
      if (piped) {
        await extract(piped);
        return;
      }
    }

    // Priority 3: read from clipboard
    const clipboard = readClipboard();
    if (clipboard && clipboard.startsWith("<")) {
      console.log(kleur.dim("  (reading from clipboard)"));
      await extract(clipboard);
      return;
    }

    console.log(kleur.red("\n  No HTML found. Either:"));
    console.log(`    1. Copy an element in Chrome DevTools, then run ${kleur.cyan("npx histrion extract")}`);
    console.log(`    2. Pass it inline: ${kleur.cyan(`npx histrion extract '<button id="ok">OK</button>'`)}`);
    console.log();
    process.exit(1);
  });

program.parse();
