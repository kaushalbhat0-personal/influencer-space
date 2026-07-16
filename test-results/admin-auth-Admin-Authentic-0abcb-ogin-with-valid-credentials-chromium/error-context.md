# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin\auth.spec.ts >> Admin Authentication >> should login with valid credentials
- Location: tests\admin\auth.spec.ts:12:7

# Error details

```
Test timeout of 30000ms exceeded.
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
  6  | test.describe("Admin Authentication", () => {
  7  |   test("should show login page", async ({ page }) => {
  8  |     await page.goto("/admin/login");
  9  |     await expect(page.locator("h1")).toContainText("Admin Login");
  10 |   });
  11 | 
  12 |   test("should login with valid credentials", async ({ page }) => {
  13 |     await page.goto("/admin/login");
  14 |     await page.fill('input[type="email"]', ADMIN_EMAIL);
  15 |     await page.fill('input[type="password"]', ADMIN_PASSWORD);
  16 |     await page.click('button:has-text("Sign in")');
> 17 |     await page.waitForURL("/admin/dashboard");
     |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  18 |     await expect(page.locator("h1")).toContainText("Dashboard");
  19 |   });
  20 | 
  21 |   test("should show error with invalid credentials", async ({ page }) => {
  22 |     await page.goto("/admin/login");
  23 |     await page.fill('input[type="email"]', "wrong@example.com");
  24 |     await page.fill('input[type="password"]', "wrongpass");
  25 |     await page.click('button:has-text("Sign in")');
  26 |     await expect(page.locator("text=Invalid email or password")).toBeVisible();
  27 |   });
  28 | });
  29 | 
```