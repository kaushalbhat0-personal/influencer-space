import { test, expect } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  test.setTimeout(30000);
  const resp = await page.goto("/");
  expect(resp?.ok()).toBeTruthy();
  await page.screenshot({ path: "test-screenshots/homepage.png" });
});

test("login page loads", async ({ page }) => {
  test.setTimeout(30000);
  await page.goto("/admin/login");
  await page.waitForLoadState("networkidle");
  const html = await page.content();
  console.log("Login page HTML length:", html.length);
  console.log("Has email field:", html.includes('type="email"'));
  console.log("Has password field:", html.includes('type="password"'));
  await page.screenshot({ path: "test-screenshots/login-page.png" });
});

test("super admin login", async ({ page }) => {
  test.setTimeout(60000);
  const email = process.env.SUPERADMIN_EMAIL || "superadmin@influencer.space";
  const password = process.env.SUPERADMIN_PASSWORD || "admin123";
  await page.goto("/admin/login");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  // Try filling by label text
  const emailFields = page.locator('input[type="email"]');
  const passwordFields = page.locator('input[type="password"]');
  console.log("Email fields found:", await emailFields.count());
  console.log("Password fields found:", await passwordFields.count());
  if (await emailFields.count() > 0) {
    await emailFields.first().fill(email);
    await passwordFields.first().fill(password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: "test-screenshots/after-login.png" });
    console.log("Final URL:", page.url());
  } else {
    await page.screenshot({ path: "test-screenshots/login-form-debug.png", fullPage: true });
  }
});
