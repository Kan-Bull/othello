[create_pw_clean_terminal_demo.html](https://github.com/user-attachments/files/26381562/create_pw_clean_terminal_demo.html)<p align="center">
  <img src="https://img.shields.io/badge/Playwright-2D4F67?style=for-the-badge&logo=playwright&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Biome-60A5FA?style=for-the-badge&logo=biome&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

<h1 align="center">⚡ create-prologue</h1>

<p align="center">
  <strong>Scaffold a production-grade Playwright project in 30 seconds.</strong><br>
  Page Object Model · Typed fixtures · Data builders · Visual regression · CI/CD
</p>

<br>

[U<style>
.term{background:#0f172a;border-radius:var(--border-radius-lg);overflow:hidden;font-family:var(--font-mono);font-size:13px;line-height:1.6}
.term-bar{background:#1e293b;padding:8px 16px;display:flex;align-items:center;gap:8px}
.dot{width:12px;height:12px;border-radius:50%}
.term-body{padding:16px 20px;min-height:420px;color:#e2e8f0}
.prompt{color:#22d3ee}
.g{color:#4ade80}
.y{color:#fbbf24}
.d{color:#64748b}
.cy{color:#22d3ee}
.w{color:#e2e8f0}
.spin{display:inline-block}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
.cursor{display:inline-block;width:8px;height:16px;background:#22d3ee;vertical-align:text-bottom;animation:blink 1s step-end infinite}
.line{opacity:0;transform:translateY(4px);transition:opacity .3s,transform .3s}
.line.show{opacity:1;transform:translateY(0)}
</style>
<div class="term">
<div class="term-bar">
<div class="dot" style="background:#ef4444"></div>
<div class="dot" style="background:#fbbf24"></div>
<div class="dot" style="background:#22c55e"></div>
<span style="color:#94a3b8;font-size:12px;margin-left:8px">Terminal</span>
</div>
<div class="term-body" id="tb">
<div class="line" id="l0"><span class="prompt">~/ </span><span class="w">npx create-pw-clean</span></div>
<div class="line" id="l1"><br><span class="cy" style="font-weight:700">  ⚡ create-pw-clean</span> <span class="d">— scaffold a production-grade Playwright project</span></div>
<div class="line" id="l2"><br><span class="d">  ?</span> <span class="w">Project name:</span> <span class="cy">edc-e2e-tests</span></div>
<div class="line" id="l3"><span class="d">  ?</span> <span class="w">Application base URL:</span> <span class="cy">https://staging.creditlens.moody.com</span></div>
<div class="line" id="l4"><span class="d">  ?</span> <span class="w">Include visual regression tests?</span> <span class="cy">Yes</span></div>
<div class="line" id="l5"><span class="d">  ?</span> <span class="w">Include API helpers for setup/teardown?</span> <span class="cy">Yes</span></div>
<div class="line" id="l6"><span class="d">  ?</span> <span class="w">Include GitHub Actions CI/CD?</span> <span class="cy">Yes</span></div>
<div class="line" id="l7"><br>  <span class="g">✓</span> <span class="w">Scaffolded 36 files</span></div>
<div class="line" id="l8">  <span class="g">✓</span> <span class="w">Dependencies installed</span></div>
<div class="line" id="l9">  <span class="g">✓</span> <span class="w">Playwright browsers installed</span></div>
<div class="line" id="l10">  <span class="g">✓</span> <span class="w">All files pass lint &amp; format</span></div>
<div class="line" id="l11">  <span class="g">✓</span> <span class="w">Git repository initialized with first commit</span></div>
<div class="line" id="l12"><br>  <span class="g" style="font-weight:700">✓ Project ready!</span></div>
<div class="line" id="l13"><br>  <span style="font-weight:500;color:#e2e8f0">Get started:</span><br><br>    <span class="d">cd edc-e2e-tests</span><br>    <span class="d">code .</span></div>
<div class="line" id="l14"><br><span class="prompt">~/ </span><span class="cursor"></span></div>
</div>
</div>
<div style="display:flex;gap:8px;margin-top:12px;align-items:center">
<button onclick="replay()" style="font-size:13px">Replay</button>
<span style="font-size:12px;color:var(--color-text-tertiary)">Animated terminal demo</span>
</div>
<script>
const delays=[0,600,1200,1800,2100,2400,2700,3200,3800,4400,4800,5200,5700,6300,7000];
function replay(){
  for(let i=0;i<15;i++){const el=document.getElementById('l'+i);if(el)el.classList.remove('show')}
  delays.forEach((d,i)=>{setTimeout(()=>{const el=document.getElementById('l'+i);if(el)el.classList.add('show')},d)})
}
replay();
</script>ploading create_pw_clean_terminal_demo.html…]()


## What you get

Run one command. Answer 5 questions. Get a fully configured project with:

- **Page Object Model architecture** — 7-layer separation of concerns
- **Reusable components** — Table, Modal, Form, Toast out of the box
- **Type-safe fixtures** — Page Objects injected into tests automatically
- **Fluent data builders** — `UserBuilder.create().withRole('admin').build()`
- **API helpers** — setup/teardown without touching the UI
- **Visual regression** — screenshot comparison with smart masking
- **Custom HTML reporter** — dark-mode, filterable, tag-aware
- **Auth state caching** — login once, reuse across all tests
- **Structured logger** — every action traced with timestamps
- **Custom expect matchers** — domain-specific assertions
- **Biome** — linting + formatting, zero config
- **GitHub Actions** — CI/CD with matrix strategy, manual dispatch
- **13 documentation guides** — from getting started to best practices

## Quick start

```bash
npx create-prologue
```

That's it. The CLI scaffolds the project, installs dependencies, downloads Playwright browsers, runs a lint check, and initializes git. You walk away with a ready-to-use test suite.

```
  ⚡ create-prologue — scaffold a production-grade Playwright project

  ? Project name: my-e2e-tests
  ? Application base URL: https://staging.example.com
  ? Include visual regression tests? Yes
  ? Include API helpers for setup/teardown? Yes
  ? Include GitHub Actions CI/CD? Yes

  ✓ Scaffolded 36 files
  ✓ Dependencies installed
  ✓ Playwright browsers installed
  ✓ All files pass lint & format
  ✓ Git repository initialized with first commit

  ✓ Project ready!

  Get started:

    cd my-e2e-tests
    code .
```

## The golden rule

> **Tests never contain selectors.** They read like specifications.

```typescript
test('admin can approve a pending application', async ({ dashboardPage }) => {
  await dashboardPage.navigateTo('applications');
  await dashboardPage.applications.filterByStatus('pending');
  await dashboardPage.applications.approve(0);
  await dashboardPage.toast.expectSuccess('Application approved');
});
```

If you see a `page.click()` or a `data-testid` in a test file, something went wrong.

## Architecture

```
src/
├── core/           Abstract base classes (BasePage, BaseComponent, BaseAPI)
├── components/     Reusable UI components (Table, Modal, Form, Toast)
├── pages/          Page Objects — one per page of your app
├── fixtures/       Type-safe dependency injection into tests
├── api/            HTTP clients for test setup/teardown
├── data/
│   ├── builders/   Fluent test data builders
│   └── types/      Domain types
├── config/         Environment & user configuration
├── reporters/      Custom HTML reporter
└── utils/          Logger, visual helpers, custom matchers

tests/
├── e2e/            End-to-end test specs
└── visual/         Visual regression specs

docs/               Local-only documentation (13 guides, gitignored)
```

Dependencies flow **down** only. Tests → Fixtures → Pages → Components → Core → Config.

## Available scripts

| Script | Description |
|--------|-------------|
| `npm test` | Run all tests |
| `npm run test:smoke` | Run `@smoke` tagged tests |
| `npm run test:regression` | Run `@regression` tagged tests |
| `npm run test:visual` | Visual regression tests |
| `npm run test:ui` | Open Playwright UI mode |
| `npm run test:debug` | Step-by-step debugger |
| `npm run test:staging` | Run against staging env |
| `npm run lint` | Check with Biome |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run codegen` | Playwright code generator |

## Adding a new page — 3 steps

**1. Create the Page Object** (`src/pages/settings.page.ts`):

```typescript
export class SettingsPage extends BasePage {
  readonly path = '/settings';
  readonly pageTitle = /Settings/;

  private readonly nameInput = this.page.getByTestId('settings-name');
  private readonly saveButton = this.page.getByTestId('settings-save');

  async updateName(name: string): Promise<void> {
    await this.fill(this.nameInput, name, 'name');
    await this.click(this.saveButton, 'Save');
  }
}
```

**2. Register the fixture** (`src/fixtures/index.ts`):

```typescript
settingsPage: async ({ page }, use) => {
  await use(new SettingsPage(page));
},
```

**3. Use in tests**:

```typescript
test('can update name', async ({ settingsPage }) => {
  await settingsPage.navigate();
  await settingsPage.updateName('New Name');
});
```

## Environment management

```bash
TEST_ENV=staging npm test    # staging environment
TEST_ENV=dev npm test        # dev environment
BASE_URL=https://custom.url npm test  # override URL
```

Environments are defined in `src/config/env.config.ts` with per-env timeouts, retries, workers, and headless mode.

## Documentation

The scaffolded project includes 13 local documentation guides in `docs/` (gitignored). They cover everything from architecture to best practices, written for developers new to the framework.

Open `docs/00-index.md` in VS Code or Obsidian to browse them.

## Requirements

- Node.js 18+
- npm 8+

## License

MIT
