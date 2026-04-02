# {{projectName}} — AI Coding Instructions

This is a Playwright + TypeScript test automation project using Page Object Model (POM) architecture.
Follow these rules strictly when generating or modifying code.

## Architecture

The project uses a 7-layer architecture. Dependencies flow **down only**:

```
Tests → Fixtures → Pages → Components → Core → Config → Utils
```

| Layer | Directory | Purpose |
|-------|-----------|---------|
| Tests | `tests/e2e/` | Test specs — no selectors, no raw Playwright calls |
| Fixtures | `src/fixtures/` | Dependency injection — bridges Page Objects to tests |
| Pages | `src/pages/` | Page Objects — one per application page |
| Components | `src/components/` | Reusable UI parts (Table, Modal, Form, Toast) |
| Core | `src/core/` | Abstract base classes (BasePage, BaseComponent, BaseAPI) |
| Config | `src/config/` | Environment & user configuration |
| Utils | `src/utils/` | Logger, custom matchers, visual helpers |

## The Golden Rule

> **Tests NEVER contain selectors or raw Playwright calls.**
> They read like specifications, calling only Page Object methods.

```typescript
// CORRECT
test('user can log in', async ({ loginPage }) => {
  await loginPage.navigate();
  await loginPage.fillCredentials({ username: 'user@test.com', password: 's3cret' });
  await loginPage.submit();
  await loginPage.expectDashboard();
});

// WRONG — never do this in a test file
test('user can log in', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="username"]', 'user@test.com');
  await page.click('button[type="submit"]');
});
```

## Writing Tests

### Imports

Always import `test` and `expect` from the project fixtures, **never** from `@playwright/test`:

```typescript
// CORRECT
import { test, expect } from '../../src/fixtures';

// WRONG
import { test, expect } from '@playwright/test';
```

### Structure

- Use fixture-injected Page Objects — never call `new Page()` in tests
- One behavior per test — if you need "and", split into two tests
- Tag every `test.describe` block: `@smoke`, `@regression`, `@critical`, `@visual`
- Test descriptions: `"should <expected behavior>"` or `"<subject> can <action>"`

```typescript
test.describe('Login @smoke', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.navigate();
  });

  test('should show error for invalid credentials', async ({ loginPage }) => {
    await loginPage.fillCredentials({ username: 'bad', password: 'bad' });
    await loginPage.submit();
    await loginPage.expectError('Invalid credentials');
  });
});
```

### Forbidden in tests

- **No `page.waitForTimeout()`** — wait for conditions: `waitForLoadState`, `waitForResponse`, or expect assertions
- **No `try/catch` to swallow failures** — let tests fail, investigate why
- **No shared mutable state between tests** — each test is independent, use fixtures for setup
- **No hardcoded test data** — use data builders

## Writing Page Objects

Every Page Object extends `BasePage` and follows this structure:

```typescript
import { expect } from '@playwright/test';
import { BasePage } from '../core/base.page';
import type { MyData } from '../data/types';

export class MyPage extends BasePage {
  readonly path = '/my-page';
  readonly pageTitle = /My Page/;

  // ── Locators (private — never exposed to tests) ──
  private readonly emailInput = this.page.getByTestId('email');
  private readonly submitButton = this.page.getByRole('button', { name: 'Submit' });
  private readonly successAlert = this.page.getByRole('alert');

  // ── Actions ──
  async fillForm(data: MyData): Promise<void> {
    this.log.step('Filling form');
    await this.fill(this.emailInput, data.email, 'email');
  }

  async submit(): Promise<void> {
    this.log.step('Submitting form');
    await this.click(this.submitButton, 'Submit button');
  }

  // ── Assertions ──
  async expectSuccess(): Promise<void> {
    this.log.step('Verifying success');
    await expect(this.successAlert).toBeVisible();
    this.log.success('Success alert visible');
  }
}
```

### Rules

- **All locators are `private readonly`** — never expose selectors to tests
- **Use BasePage inherited methods:** `this.fill()`, `this.click()`, `this.selectOption()`, `this.getText()` — not raw `page.fill()` or `page.click()`
- **Use the structured logger:** `this.log.step()` for high-level actions, `this.log.action()` for details, `this.log.success()` for confirmations
- **Assertions live in the Page Object** as `expect*()` methods
- **If a Page Object exceeds ~200 lines**, extract reusable parts into Components

## Components

Reusable UI patterns (modals, tables, forms, toasts) extend `BaseComponent`:

```typescript
import { BaseComponent } from '../core/base.component';

export class ModalComponent extends BaseComponent {
  private readonly title = this.locator('[data-testid="modal-title"]');
  private readonly confirmButton = this.locator('[data-testid="modal-confirm"]');

  async confirm(): Promise<void> {
    this.log.action('Confirm modal');
    await this.confirmButton.click();
    await this.waitForHidden();
  }
}
```

Components use `this.locator()` (scoped to the root element) and direct Playwright calls on locators. They are composed into Page Objects:

```typescript
readonly confirmModal = new ModalComponent(this.page, this.page.locator('[data-testid="confirm-modal"]'));
```

## Naming Conventions

### Files

| Type | Pattern | Example |
|------|---------|---------|
| Page Object | `kebab-case.page.ts` | `user-profile.page.ts` |
| Component | `kebab-case.component.ts` | `date-picker.component.ts` |
| Test spec | `kebab-case.spec.ts` | `user-profile.spec.ts` |
| API client | `kebab-case.api.ts` | `user.api.ts` |
| Builder | `kebab-case.builder.ts` | `user.builder.ts` |

### Classes and methods

| Type | Pattern | Example |
|------|---------|---------|
| Page class | `PascalCase + Page` | `UserProfilePage` |
| Component class | `PascalCase + Component` | `DatePickerComponent` |
| API class | `PascalCase + API` | `UserAPI` |
| Builder class | `PascalCase + Builder` | `UserBuilder` |
| Action methods | Verb phrase | `submitForm()`, `deleteRow()` |
| Assertion methods | `expect` + noun | `expectSuccess()`, `expectErrorMessage()` |

## Adding a New Page — The Workflow

Always follow these 4 steps in order:

1. **Define the data type** in `src/data/types/`
2. **Create the Page Object** in `src/pages/` extending `BasePage`
3. **Register the fixture** in `src/fixtures/index.ts`
4. **Write the test** in `tests/e2e/`

## Fixtures

All Page Objects are registered in `src/fixtures/index.ts`:

```typescript
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';

type TestFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect } from '../utils/custom-matchers';
```

**Every new Page Object must be registered here.** Tests receive pages via parameter destructuring.

## Data Builders

Use the fluent builder pattern extending `Builder<T>`:

```typescript
import { Builder } from './base.builder';
import type { UserData } from '../types';

export class UserBuilder extends Builder<UserData> {
  constructor() {
    super({ name: 'John', email: 'john@test.com', role: 'user' });
  }

  static create(): UserBuilder {
    return new UserBuilder();
  }

  withRole(role: string): this {
    this.data.role = role;
    return this;
  }
}
```

Usage: `UserBuilder.create().withRole('admin').build()`

## Checklist Before Commit

- [ ] Tests pass: `npm test`
- [ ] No selectors in test files
- [ ] Every `test.describe` has a tag
- [ ] New Page Objects registered in `src/fixtures/index.ts`
- [ ] No `waitForTimeout()` calls
- [ ] No hardcoded test data — use builders
- [ ] Imports from `src/fixtures`, not `@playwright/test`
- [ ] Lint passes: `npm run lint`
