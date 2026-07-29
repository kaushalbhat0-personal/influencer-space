import type { Page } from "@playwright/test";

export interface TestUser {
  email: string;
  password: string;
  role: string;
}

export const USERS = {
  creator: { email: "test-creator@example.com", password: "Test1234!", role: "ADMIN" },
  agency: { email: "test-agency@example.com", password: "Test1234!", role: "AGENCY_ADMIN" },
  super_admin: { email: "admin@example.com", password: "Admin1234!", role: "SUPER_ADMIN" },
} satisfies Record<string, TestUser>;

export async function loginAs(page: Page, user: TestUser) {
  await page.goto("/admin/login");
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin|\/agency|\/super-admin/, { timeout: 15000 });
}

export async function logout(page: Page) {
  await page.goto("/admin/login");
}

export async function loginAsCreator(page: Page) {
  await loginAs(page, USERS.creator);
}

export async function loginAsAgency(page: Page) {
  await loginAs(page, USERS.agency);
}

export async function loginAsSuperAdmin(page: Page) {
  await loginAs(page, USERS.super_admin);
}
