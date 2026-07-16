# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin\games.spec.ts >> Admin Games – CRUD & Data Reflection >> should show games list
- Location: tests\admin\games.spec.ts:15:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/admin/dashboard" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e4]:
    - generic [ref=e7]:
      - generic [ref=e8]:
        - heading "Admin Login" [level=1] [ref=e9]
        - paragraph [ref=e10]: Sign in to manage your CreatorBrand
      - generic [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e13]: Email
          - textbox "Email" [ref=e14]:
            - /placeholder: admin@snaxgaming.com
            - text: admin@snaxgaming.com
        - generic [ref=e15]:
          - generic [ref=e16]: Password
          - textbox "Password" [ref=e17]:
            - /placeholder: ••••••••
            - text: admin123
        - button "Signing in..." [disabled] [ref=e18]:
          - generic [ref=e19]:
            - img [ref=e20]
            - text: Signing in...
  - alert [ref=e23]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const ADMIN_EMAIL = "admin@snaxgaming.com";
  4  | const ADMIN_PASSWORD = "admin123";
  5  | 
  6  | test.describe("Admin Games – CRUD & Data Reflection", () => {
  7  |   test.beforeEach(async ({ page }) => {
  8  |     await page.goto("/admin/login");
  9  |     await page.fill('input[type="email"]', ADMIN_EMAIL);
  10 |     await page.fill('input[type="password"]', ADMIN_PASSWORD);
  11 |     await page.click('button:has-text("Sign in")');
> 12 |     await page.waitForURL("/admin/dashboard");
     |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  13 |   });
  14 | 
  15 |   test("should show games list", async ({ page }) => {
  16 |     await page.click('a:has-text("Games")');
  17 |     await page.waitForURL("/admin/games");
  18 |     await expect(page.locator("h1")).toContainText("Games");
  19 |   });
  20 | 
  21 |   test("should create + edit + delete a game with data reflecting after each step", async ({ page }) => {
  22 |     const createName = "GameCreate " + Date.now();
  23 |     const editName = "GameEdit " + Date.now();
  24 | 
  25 |     // CREATE
  26 |     await page.click('a:has-text("Games")');
  27 |     await page.waitForURL("/admin/games");
  28 |     await page.click('a:has-text("New Game")');
  29 |     await page.waitForURL("/admin/games/new");
  30 |     await page.fill('input[name="name"]', createName);
  31 |     await page.fill('input[name="genre"]', "Battle Royale");
  32 |     await page.click('button:has-text("Create Game")');
  33 |     await page.waitForURL("/admin/games");
  34 |     await expect(page.locator(`text=${createName}`)).toBeVisible({ timeout: 8000 });
  35 | 
  36 |     // EDIT
  37 |     await page.locator('a:has-text("Edit")').first().click();
  38 |     await page.waitForURL(/\/admin\/games\/.+\/edit/);
  39 |     await page.fill('input[name="name"]', editName);
  40 |     await page.click('button:has-text("Save Changes")');
  41 |     await page.waitForURL("/admin/games");
  42 |     await expect(page.locator(`text=${editName}`)).toBeVisible({ timeout: 8000 });
  43 |     await expect(page.locator(`text=${createName}`)).not.toBeVisible();
  44 | 
  45 |     // DELETE
  46 |     page.on("dialog", (d) => d.accept());
  47 |     await page.locator('button:has-text("Delete")').first().click();
  48 |     await page.waitForTimeout(1000);
  49 |     await expect(page.locator(`text=${editName}`)).not.toBeVisible({ timeout: 8000 });
  50 |   });
  51 | });
  52 | 
```