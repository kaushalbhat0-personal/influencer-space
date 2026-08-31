import type { Page } from "@playwright/test";

export interface TestUser {
  email: string;
  password: string;
  role: string;
}

export const USERS = {
  creator: { email: process.env.CREATOR_EMAIL ?? "testcreator4@gmail.com", password: process.env.CREATOR_PASSWORD ?? "admin123", role: "ADMIN" },
  agency: { email: process.env.AGENCY_EMAIL ?? "agencyadmin@creatortest.com", password: process.env.AGENCY_PASSWORD ?? "admin123", role: "AGENCY_ADMIN" },
  super_admin: { email: process.env.SUPERADMIN_EMAIL ?? "superadmin@influencer.space", password: process.env.SUPERADMIN_PASSWORD ?? "admin123", role: "SUPER_ADMIN" },
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
