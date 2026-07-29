import { test } from "@playwright/test";

const EMAIL = process.env.SUPERADMIN_EMAIL ?? "superadmin@influencer.space";
const PASSWORD = process.env.SUPERADMIN_PASSWORD ?? "admin123";

test("capture all super admin pages", async ({ page }) => {
  test.setTimeout(300000);

  // First, capture the login page state
  await page.goto("/admin/login");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "test-screenshots/00-login-page.png", fullPage: true });

  // Try to find and fill any input fields available
  const inputs = page.locator('input:not([type="hidden"])');
  const inputCount = await inputs.count();
  console.log(`Found ${inputCount} visible input fields`);

  for (let i = 0; i < inputCount; i++) {
    const input = inputs.nth(i);
    const type = await input.getAttribute("type");
    const id = await input.getAttribute("id");
    const name = await input.getAttribute("name");
    const placeholder = await input.getAttribute("placeholder");
    console.log(`  Input ${i}: type=${type}, id=${id}, name=${name}, placeholder=${placeholder}`);
  }

  // Try filling by input index
  if (inputCount >= 2) {
    await inputs.nth(0).fill(EMAIL);
    await inputs.nth(1).fill(PASSWORD);
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")');
    console.log(`Submit buttons found: ${await submitBtn.count()}`);
    if (await submitBtn.count() > 0) {
      await submitBtn.first().click();
      await page.waitForTimeout(8000);
      await page.screenshot({ path: "test-screenshots/00-after-login.png", fullPage: true });
      console.log("Final URL after login attempt:", page.url());
    }
  }

  // Navigate to super admin pages directly and capture
  const pages = [
    "/super-admin",
    "/super-admin/revenue-management",
    "/super-admin/revenue-management/commissions",
    "/super-admin/revenue-management/settings",
    "/super-admin/themes",
    "/super-admin/templates",
    "/super-admin/activity",
    "/super-admin/insights",
  ];

  for (let i = 0; i < pages.length; i++) {
    await page.goto(pages[i]!);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
    const name = pages[i]!.replace(/\//g, "-").replace(/^-/, "") || "dashboard";
    await page.screenshot({ path: `test-screenshots/${String(i + 1).padStart(2, "0")}-${name}.png`, fullPage: true });
    console.log(`Captured: ${pages[i]}`);
  }
});
