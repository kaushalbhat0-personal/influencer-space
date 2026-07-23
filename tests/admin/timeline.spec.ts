import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@snaxgaming.com";
const ADMIN_PASSWORD = "admin123";

test.describe("Admin Timeline – CRUD & Data Reflection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("/admin/dashboard");
  });

  test("should show timeline list", async ({ page }) => {
    await page.goto("/admin/timeline");
    await page.waitForURL("/admin/timeline");
    await expect(page.locator("h1")).toContainText(/Timeline|Milestones/);
  });

  test("should create + edit + delete a timeline event with data reflecting after each step", async ({ page }) => {
    const createTitle = "TimeCreate " + Date.now();
    const editTitle = "TimeEdit " + Date.now();

    // CREATE
    await page.goto("/admin/timeline");
    await page.waitForURL("/admin/timeline");
    await page.click('a:has-text("New Event")');
    await page.waitForURL("/admin/timeline/new");
    await page.fill('input[name="year"]', "2025");
    await page.fill('input[name="title"]', createTitle);
    await page.fill('textarea[name="description"]', "Test description for timeline event.");
    await page.click('button:has-text("Create Event")');
    await page.waitForURL("/admin/timeline");
    await expect(page.locator(`text=${createTitle}`)).toBeVisible({ timeout: 8000 });

    // EDIT
    await page.locator('a:has-text("Edit")').first().click();
    await page.waitForURL(/\/admin\/timeline\/.+\/edit/);
    await page.fill('input[name="title"]', editTitle);
    await page.click('button:has-text("Save Changes")');
    await page.waitForURL("/admin/timeline");
    await expect(page.locator(`text=${editTitle}`)).toBeVisible({ timeout: 8000 });
    await expect(page.locator(`text=${createTitle}`)).not.toBeVisible();

    // DELETE
    page.on("dialog", (d) => d.accept());
    await page.locator('button:has-text("Delete")').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${editTitle}`)).not.toBeVisible({ timeout: 8000 });
  });
});
