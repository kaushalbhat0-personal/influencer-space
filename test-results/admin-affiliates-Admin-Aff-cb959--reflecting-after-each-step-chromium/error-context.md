# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin\affiliates.spec.ts >> Admin Affiliates – CRUD & Data Reflection >> should create + edit + delete an affiliate with data reflecting after each step
- Location: tests\admin\affiliates.spec.ts:21:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/admin/dashboard" until "load"
  navigated to "http://localhost:3000/admin/login?error=CredentialsSignin"
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
      - generic [ref=e11]: Invalid email or password. Please try again.
      - generic [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: Email
          - textbox "Email" [ref=e15]:
            - /placeholder: admin@snaxgaming.com
            - text: admin@snaxgaming.com
        - generic [ref=e16]:
          - generic [ref=e17]: Password
          - textbox "Password" [ref=e18]:
            - /placeholder: ••••••••
            - text: admin123
        - button "Sign in" [ref=e19] [cursor=pointer]
  - alert [ref=e20]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const ADMIN_EMAIL = "admin@snaxgaming.com";
  4  | const ADMIN_PASSWORD = "admin123";
  5  | 
  6  | test.describe("Admin Affiliates – CRUD & Data Reflection", () => {
  7  |   test.beforeEach(async ({ page }) => {
  8  |     await page.goto("/admin/login");
  9  |     await page.fill('input[type="email"]', ADMIN_EMAIL);
  10 |     await page.fill('input[type="password"]', ADMIN_PASSWORD);
  11 |     await page.click('button:has-text("Sign in")');
> 12 |     await page.waitForURL("/admin/dashboard");
     |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  13 |   });
  14 | 
  15 |   test("should show affiliates list", async ({ page }) => {
  16 |     await page.click('a:has-text("Affiliates")');
  17 |     await page.waitForURL("/admin/affiliates");
  18 |     await expect(page.locator("h1")).toContainText("Affiliate");
  19 |   });
  20 | 
  21 |   test("should create + edit + delete an affiliate with data reflecting after each step", async ({ page }) => {
  22 |     const createTitle = "AffCreate " + Date.now();
  23 |     const editTitle = "AffEdit " + Date.now();
  24 | 
  25 |     // CREATE
  26 |     await page.click('a:has-text("Affiliates")');
  27 |     await page.waitForURL("/admin/affiliates");
  28 |     await page.click('a:has-text("New Affiliate")');
  29 |     await page.waitForURL("/admin/affiliates/new");
  30 |     await page.fill('input[name="title"]', createTitle);
  31 |     await page.fill('input[name="url"]', "https://example.com/test");
  32 |     await page.click('button:has-text("Create Affiliate")');
  33 |     await page.waitForURL("/admin/affiliates");
  34 |     await expect(page.locator(`text=${createTitle}`)).toBeVisible({ timeout: 8000 });
  35 | 
  36 |     // EDIT
  37 |     await page.locator('a:has-text("Edit")').first().click();
  38 |     await page.waitForURL(/\/admin\/affiliates\/.+\/edit/);
  39 |     await page.fill('input[name="title"]', editTitle);
  40 |     await page.click('button:has-text("Save Changes")');
  41 |     await page.waitForURL("/admin/affiliates");
  42 |     await expect(page.locator(`text=${editTitle}`)).toBeVisible({ timeout: 8000 });
  43 |     await expect(page.locator(`text=${createTitle}`)).not.toBeVisible();
  44 | 
  45 |     // DELETE
  46 |     page.on("dialog", (d) => d.accept());
  47 |     await page.locator('button:has-text("Delete")').first().click();
  48 |     await page.waitForTimeout(1000);
  49 |     await expect(page.locator(`text=${editTitle}`)).not.toBeVisible({ timeout: 8000 });
  50 |   });
  51 | });
  52 | 
```