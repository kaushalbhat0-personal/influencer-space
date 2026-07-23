/**
 * Storefront E2E Tests v1.0.0
 */

import { test, expect } from "../fixtures/auth";
import { Storefront } from "../pages/storefront";

test.describe("Storefront", () => {
  test("Valid subdomain renders storefront", async ({ guestPage }) => {
    const store = new Storefront(guestPage);
    await store.goto("testcreator");
    const title = await store.getTitle();
    expect(title).toBeTruthy();
    expect(title).not.toBe("Creator Not Found");
  });

  test("Storefront shows products", async ({ guestPage }) => {
    const store = new Storefront(guestPage);
    await store.goto("testcreator");
    const hasProducts = await store.hasProducts();
    expect(hasProducts).toBe(true);
  });

  test("Invalid subdomain shows 404", async ({ guestPage }) => {
    const store = new Storefront(guestPage);
    await store.goto("nonexistent-tenant-xyz");
    const text = await store.getNotFoundText();
    expect(text).toContain("Creator Not Found");
  });

  test("Robots.txt is accessible", async ({ guestPage }) => {
    const response = await guestPage.goto("/robots.txt");
    expect(response?.status()).toBe(200);
  });

  test("Sitemap returns XML", async ({ guestPage }) => {
    const response = await guestPage.goto("/sitemap.xml");
    expect(response?.status()).toBe(200);
    const text = await response?.text();
    expect(text).toContain("<urlset");
  });

  test("Health endpoint returns ok", async ({ guestPage }) => {
    const response = await guestPage.goto("/api/health");
    expect(response?.status()).toBeGreaterThanOrEqual(200);
    expect(response?.status()).toBeLessThan(600);
  });
});
