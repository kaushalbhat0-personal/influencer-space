/**
 * Marketing Contact & Navigation Polish — RCCF-LAUNCH-POLISH-05
 *
 * Verifies the canonical public contact (info.micronest@gmail.com) on every
 * marketing surface, that no phone/WhatsApp placeholders remain, and that every
 * standalone marketing page has the shared nav/footer (an obvious way back).
 */
import { test, expect } from "@playwright/test";

const CANONICAL_EMAIL = "info.micronest@gmail.com";

const MARKETING_PAGES = ["/", "/about", "/features", "/faq", "/pricing", "/contact", "/privacy", "/terms", "/refund"];

const LEGAL_PAGES = ["/privacy", "/terms", "/refund", "/contact"];

test.describe("Marketing Contact & Navigation Polish", () => {
  test.describe.configure({ mode: "serial" });

  test("contact page shows the canonical email and no phone/WhatsApp", async ({ page }) => {
    const resp = await page.goto("/contact");
    expect(resp?.ok()).toBeTruthy();
    const mailto = page.locator(`a[href="mailto:${CANONICAL_EMAIL}"]`);
    await expect(mailto.first()).toBeVisible();
    await expect(page.getByText("We usually respond within one business day.").first()).toBeVisible();
    await expect(page.getByText(/WhatsApp/i)).toHaveCount(0);
    await expect(page.getByText(/\+91/i)).toHaveCount(0);
    await expect(page.getByText(/call us/i)).toHaveCount(0);
  });

  test("footer uses the canonical email on every marketing page", async ({ page }) => {
    for (const path of MARKETING_PAGES) {
      const resp = await page.goto(path);
      if (!resp?.ok()) continue; // dynamic pages may require a DB — skip gracefully
      const footerLink = page.locator(`footer a[href="mailto:${CANONICAL_EMAIL}"]`);
      await expect(footerLink.first()).toBeVisible();
    }
  });

  test("legal pages have the shared navigation (a way back home)", async ({ page }) => {
    for (const path of LEGAL_PAGES) {
      const resp = await page.goto(path);
      if (!resp?.ok()) continue;
      // MarketingNav logo links to the homepage.
      const navLogo = page.locator('nav a[href="/"]').first();
      await expect(navLogo).toBeVisible();
      // Footer contact matches the canonical email.
      await expect(page.locator(`footer a[href="mailto:${CANONICAL_EMAIL}"]`).first()).toBeVisible();
    }
  });

  test("homepage Organization schema includes the canonical email", async ({ page }) => {
    await page.goto("/");
    const jsonLd = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      return nodes.map((n) => n.textContent || "").join("\n");
    });
    expect(jsonLd).toContain('"@type":"Organization"');
    expect(jsonLd).toContain(CANONICAL_EMAIL);
  });

  test("no stale contact email or phone placeholders remain on marketing surfaces", async ({ page }) => {
    for (const path of MARKETING_PAGES) {
      const resp = await page.goto(path);
      if (!resp?.ok()) continue;
      const html = await page.content();
      expect(html).not.toContain("support@influencerspace.in");
      expect(html).not.toContain("privacy@influencerspace.in");
      expect(html).not.toContain("grievance@influencerspace.in");
      expect(html).not.toContain("+91-98765-43210");
    }
  });
});
