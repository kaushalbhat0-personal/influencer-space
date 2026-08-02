import { describe, it, expect } from "vitest";
import { accountSettingsSchema } from "../validators";

describe("Account Settings validators (IMPLEMENTATION-18B)", () => {
  it("accepts a valid account update", () => {
    const result = accountSettingsSchema.safeParse({
      contactEmail: "creator@example.com",
      phone: "+91 99999 00000",
      timezone: "Asia/Kolkata",
      language: "en-IN",
      country: "India",
      businessName: "My Studio",
      gst: "GSTIN123",
      currency: "INR",
      notifications: { email: true, push: false },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a partial update", () => {
    const result = accountSettingsSchema.safeParse({ contactEmail: "new@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = accountSettingsSchema.safeParse({ contactEmail: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("does NOT accept storefront identity fields (owned by Hero)", () => {
    // Identity fields must be ignored/not part of the account schema.
    const parsed = accountSettingsSchema.safeParse({ name: "Should Not Be Here" });
    expect(parsed.success).toBe(true);
    // The schema has no `name` key — extra keys are stripped by zod default.
    expect("name" in (parsed.data as object)).toBe(false);
  });
});
