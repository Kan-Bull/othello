import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

interface TestEntry {
  title: string;
  suite: string;
  status: string;
  duration: number;
  tags: string[];
  error?: string;
  retry: number;
}

/**
 * Custom HTML test reporter.
 *
 * Generates a clean, single-file HTML report with:
 * - Summary dashboard (pass/fail/skip counts)
 * - Filterable test results table
 * - Tag-based grouping
 * - Duration tracking
 * - Error details for failed tests
 * - Auto-open in browser (configurable)
 *
 * Configuration in playwright.config.ts:
 * ```ts
 * reporter: [
 *   ['./src/reporters/html-report.ts', {
 *     outputFile: 'reports/results.html',
 *     open: 'on-failure', // 'always' | 'never' | 'on-failure'
 *   }],
 * ],
 * ```
 */
class CustomHTMLReporter implements Reporter {
  private results: TestEntry[] = [];
  private startTime = 0;
  private outputFile: string;
  private openBehavior: "always" | "on-failure" | "never";

  constructor(
    options: {
      outputFile?: string;
      open?: "always" | "never" | "on-failure";
    } = {},
  ) {
    this.outputFile = options.outputFile ?? "reports/test-report.html";
    this.openBehavior = options.open ?? "never";
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.startTime = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.results.push({
      title: test.title,
      suite: test.parent.title,
      status: result.status,
      duration: result.duration,
      tags: test.tags,
      error:
        result.status === "failed"
          ? result.errors.map((e) => e.message).join("\n")
          : undefined,
      retry: result.retry,
    });
  }

  onEnd(result: FullResult): void {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter((r) => r.status === "passed").length;
    const failed = this.results.filter((r) => r.status === "failed").length;
    const skipped = this.results.filter((r) => r.status === "skipped").length;

    const html = this.generateHTML({
      passed,
      failed,
      skipped,
      total: this.results.length,
      duration: totalDuration,
      status: result.status,
      results: this.results,
    });

    const dir = path.dirname(this.outputFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.outputFile, html);

    // Auto-open in browser
    if (
      this.openBehavior === "always" ||
      (this.openBehavior === "on-failure" && result.status !== "passed")
    ) {
      const fullPath = path.resolve(this.outputFile);
      const cmd =
        os.platform() === "darwin"
          ? `open "${fullPath}"`
          : os.platform() === "win32"
            ? `start "" "${fullPath}"`
            : `xdg-open "${fullPath}"`;
      execSync(cmd);
    }
  }

  private generateHTML(data: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
    duration: number;
    status: string;
    results: TestEntry[];
  }): string {
    const rows = data.results
      .map(
        (r) => `
      <tr class="status-${r.status}">
        <td>${r.suite}</td>
        <td>${r.title}</td>
        <td><span class="badge badge-${r.status}">${r.status}</span></td>
        <td>${(r.duration / 1000).toFixed(2)}s</td>
        <td>${r.tags.map((t) => `<span class="tag">${t}</span>`).join(" ")}</td>
        <td>${r.error ? `<pre class="error">${this.escapeHtml(r.error)}</pre>` : "\u2014"}</td>
      </tr>`,
      )
      .join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test Report</title>
  <style>
    :root { --pass: #22c55e; --fail: #ef4444; --skip: #f59e0b; --bg: #0f172a; --card: #1e293b; --text: #e2e8f0; --border: #334155; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 2rem; }
    .dashboard { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
    .card { background: var(--card); border-radius: 12px; padding: 1.5rem; border: 1px solid var(--border); }
    .card h3 { font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; margin-bottom: 0.5rem; }
    .card .value { font-size: 2rem; font-weight: 700; }
    .card.passed .value { color: var(--pass); }
    .card.failed .value { color: var(--fail); }
    .card.skipped .value { color: var(--skip); }
    table { width: 100%; border-collapse: collapse; background: var(--card); border-radius: 12px; overflow: hidden; }
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border); }
    th { background: #0f172a; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .badge-passed { background: #166534; color: #86efac; }
    .badge-failed { background: #991b1b; color: #fca5a5; }
    .badge-skipped { background: #92400e; color: #fde68a; }
    .tag { background: #312e81; color: #a5b4fc; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; }
    .error { background: #1e1e1e; color: #fca5a5; padding: 0.5rem; border-radius: 4px; font-size: 0.75rem; max-height: 120px; overflow: auto; white-space: pre-wrap; }
    .filter-bar { margin-bottom: 1rem; display: flex; gap: 0.5rem; }
    .filter-btn { padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--text); cursor: pointer; }
    .filter-btn.active { background: #3b82f6; border-color: #3b82f6; }
  </style>
</head>
<body>
  <h1 style="margin-bottom: 0.5rem;">Test Report</h1>
  <p style="opacity: 0.6; margin-bottom: 1.5rem;">Generated ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} \u2014 Duration: ${(data.duration / 1000).toFixed(1)}s</p>

  <div class="dashboard">
    <div class="card"><h3>Total</h3><div class="value">${data.total}</div></div>
    <div class="card passed"><h3>Passed</h3><div class="value">${data.passed}</div></div>
    <div class="card failed"><h3>Failed</h3><div class="value">${data.failed}</div></div>
    <div class="card skipped"><h3>Skipped</h3><div class="value">${data.skipped}</div></div>
  </div>

  <div class="filter-bar">
    <button class="filter-btn active" onclick="filterTests('all')">All</button>
    <button class="filter-btn" onclick="filterTests('passed')">Passed</button>
    <button class="filter-btn" onclick="filterTests('failed')">Failed</button>
    <button class="filter-btn" onclick="filterTests('skipped')">Skipped</button>
  </div>

  <table>
    <thead><tr><th>Suite</th><th>Test</th><th>Status</th><th>Duration</th><th>Tags</th><th>Error</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <script>
    function filterTests(status) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      document.querySelectorAll('tbody tr').forEach(row => {
        row.style.display = status === 'all' || row.classList.contains('status-' + status) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

export default CustomHTMLReporter;
