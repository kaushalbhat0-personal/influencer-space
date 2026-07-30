import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => console.log("CONSOLE:", msg.type(), msg.text()));
  page.on("requestfailed", (req) => console.log("FAILED:", req.url(), req.failure()?.errorText));

  await page.goto("http://localhost:3000/admin/login", { waitUntil: "load", timeout: 15000 });
  await page.fill('input[type="email"]', "admin@creatorstore.test");
  await page.fill('input[type="password"]', "admin123");

  // Listen for navigation
  const navPromise = page.waitForURL("**/super-admin**", { timeout: 10000 }).catch(() => {
    console.log("Navigation to /super-admin timed out");
  });

  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  console.log("Current URL:", page.url());
  const errorEl = page.locator(".text-red-400, [class*=error], [class*=Error]");
  if (await errorEl.isVisible().catch(() => false)) {
    console.log("Error text:", await errorEl.textContent());
  }

  await browser.close();
}

main().catch((e) => console.error("ERROR:", e.message));
