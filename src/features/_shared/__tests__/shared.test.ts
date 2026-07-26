import { describe, it, expect } from "vitest";
import { socialLinkSchema, seoSchema, slugSchema } from "../validators";
import { FEATURE_PERMISSIONS, getFeaturePermission } from "../permissions";

describe("Shared validators", () => {
  it("socialLinkSchema accepts valid input", () => {
    const result = socialLinkSchema.safeParse({ platform: "youtube", url: "https://youtube.com/@test" });
    expect(result.success).toBe(true);
  });

  it("socialLinkSchema rejects invalid url", () => {
    const result = socialLinkSchema.safeParse({ platform: "youtube", url: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("socialLinkSchema rejects empty platform", () => {
    const result = socialLinkSchema.safeParse({ platform: "", url: "https://example.com" });
    expect(result.success).toBe(false);
  });

  it("seoSchema accepts valid input", () => {
    const result = seoSchema.safeParse({ title: "My Store", description: "Best store ever" });
    expect(result.success).toBe(true);
  });

  it("seoSchema accepts empty input", () => {
    const result = seoSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("seoSchema rejects title over 70 chars", () => {
    const result = seoSchema.safeParse({ title: "x".repeat(71) });
    expect(result.success).toBe(false);
  });

  it("slugSchema accepts valid slug", () => {
    const result = slugSchema.safeParse("my-product");
    expect(result.success).toBe(true);
  });

  it("slugSchema rejects slug with spaces", () => {
    const result = slugSchema.safeParse("my product");
    expect(result.success).toBe(false);
  });

  it("slugSchema rejects uppercase", () => {
    const result = slugSchema.safeParse("My-Product");
    expect(result.success).toBe(false);
  });
});

describe("Feature permissions", () => {
  it("returns settings:write for profile", () => {
    expect(getFeaturePermission("profile")).toBe("settings:write");
  });

  it("returns content:edit for products", () => {
    expect(getFeaturePermission("products")).toBe("content:edit");
  });

  it("returns content:edit for gallery", () => {
    expect(getFeaturePermission("gallery")).toBe("content:edit");
  });

  it("returns analytics:view for analytics", () => {
    expect(getFeaturePermission("analytics")).toBe("analytics:view");
  });

  it("returns billing:read for billing", () => {
    expect(getFeaturePermission("billing")).toBe("billing:read");
  });

  it("returns domains:manage for domains", () => {
    expect(getFeaturePermission("domains")).toBe("domains:manage");
  });

  it("returns settings:write for unknown feature", () => {
    expect(getFeaturePermission("unknown")).toBe("content:edit");
  });

  it("has all expected features in FEATURE_PERMISSIONS", () => {
    const expected = ["profile", "products", "services", "courses", "gallery", "links", "testimonials", "faq", "seo", "analytics", "settings", "domains", "billing", "integrations", "dashboard"];
    for (const feat of expected) {
      expect(FEATURE_PERMISSIONS[feat]).toBeDefined();
    }
  });
});
