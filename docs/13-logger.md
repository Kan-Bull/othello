# Structured Logger

## Why a logger?

When a test fails, Playwright tells you _what_ failed — but not _what happened before_.
The structured logger gives you a timestamped, color-coded trace of every action so you can reconstruct the full story at a glance.

## What it looks like

```
14:32:01 ■ LoginPage       │ 🔹 Filling credentials for john@example.com
14:32:01 ■ LoginPage       │    ▸ Fill "username" with "john@example.com"
14:32:02 ■ LoginPage       │    ▸ Fill "password" with "••••••••"
14:32:02 ■ LoginPage       │ 🔹 Submitting login form
14:32:03 ■ LoginPage       │ ✓ Dashboard visible
```

Each line shows:

- **Timestamp** — when the action happened
- **Context** — which Page Object or Component produced the log
- **Level icon** — what kind of action it is
- **Message** — what happened

## Log levels

| Level     | Icon | Use for                                                   |
| --------- | ---- | --------------------------------------------------------- |
| `step`    | 🔹   | High-level actions: navigate, fill form, submit           |
| `action`  | ▸    | Granular interactions: click, fill a single field, select |
| `success` | ✓    | Assertions that passed                                    |
| `warn`    | ⚠    | Non-fatal warnings                                        |
| `error`   | ✗    | Failures                                                  |

`action` logs are indented under their parent `step` to create a visual hierarchy.

## How to use it

Every `BasePage`, `BaseComponent`, and `BaseAPI` class has a `this.log` instance automatically : you don't need to create one.

### In a Page Object

```typescript
export class CheckoutPage extends BasePage {
  readonly path = "/checkout";
  readonly pageTitle = /Checkout/;

  async placeOrder(): Promise<void> {
    this.log.step("Placing order");
    await this.click(this.confirmButton, "Confirm");
    this.log.success("Order placed");
  }
}
```

### In a Component

```typescript
export class CartComponent extends BaseComponent {
  async addItem(name: string): Promise<void> {
    this.log.step(`Adding "${name}" to cart`);
    // ...
    this.log.success(`"${name}" added`);
  }
}
```

### In an API helper

```typescript
export class OrderAPI extends BaseAPI {
  async createOrder(data: Order): Promise<string> {
    this.log.step(`Creating order via API`);
    const response = await this.post("/orders", data);
    this.log.success(`Order created: ${response.id}`);
    return response.id;
  }
}
```

## Customizing the theme

The logger lives in `src/utils/logger.ts`. You can customize everything:

### Change colors

Edit the `THEME` object to swap ANSI codes:

```typescript
const THEME: Record<LogLevel, { color: string; icon: string }> = {
  step: { color: CYAN, icon: "🔹" },
  action: { color: DIM, icon: " ▸ " },
  success: { color: GREEN, icon: "✓" },
  warn: { color: YELLOW, icon: "⚠" },
  error: { color: RED, icon: "✗" },
};
```

### Change icons

Replace the icon strings with whatever you prefer:

```typescript
step:    { color: CYAN,   icon: '→' },
action:  { color: DIM,    icon: '  ·' },
success: { color: GREEN,  icon: '✔' },
```

### Add a new log level

1. Add it to the `LogLevel` type:

```typescript
type LogLevel = "step" | "action" | "success" | "warn" | "error" | "debug";
```

2. Add a theme entry:

```typescript
debug: { color: DIM, icon: '🐛' },
```

3. Add the method to the `Logger` class:

```typescript
debug(message: string): void {
  this.print('debug', message);
}
```

### Change the timestamp format

Edit the `toLocaleTimeString` options in the `print` method:

```typescript
const time = new Date().toLocaleTimeString("en-US", {
  hour12: false,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
```

### Change context padding

Adjust `.padEnd(16)` in the constructor to align columns for longer or shorter class names:

```typescript
this.ctx = context.padEnd(20); // wider column
```

## Tips

- Use `step()` at the start of a public method — it marks the "what" of the action
- Use `action()` inside base class helpers (`fill`, `click`, `select`) — it marks the "how"
- Use `success()` after an assertion passes — it confirms the "then"
- Don't log everything — log what helps you debug a failure
