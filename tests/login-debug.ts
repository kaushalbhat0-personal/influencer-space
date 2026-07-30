import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("1. Navigating to login page...");
  await page.goto("http://localhost:3000/admin/login", { waitUntil: "load", timeout: 15000 });
  console.log("2. URL:", page.url());

  const emailVisible = await page.locator('input[type="email"]').isVisible();
  console.log("3. Email input visible:", emailVisible);

  if (!emailVisible) {
    const body = await page.locator("body").textContent();
    console.log("Body:", body?.substring(0, 300));
  }

  console.log("4. Filling credentials...");
  await page.fill('input[type="email"]', "admin@creatorstore.test");
  await page.fill('input[type="password"]', "admin123");
  console.log("5. Clicking submit...");
  await page.click('button[type="submit"]');

  console.log("6. Waiting for navigation...");
  await page.waitForTimeout(5000);
  console.log("7. URL after 5s:", page.url());

  const body2 = await page.locator("body").textContent().catch(() => "");
  console.log("8. Body preview:", body2.substring(0, 300));

  await browser.close();
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
