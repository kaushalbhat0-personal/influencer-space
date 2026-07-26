import { describe, it, expect } from "vitest";
import { profileUpdateSchema } from "../validators";

describe("Profile validators", () => {
  it("accepts valid profile update", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Test Creator",
      tagline: "Gaming",
      bio: "I make content",
      brandColors: { primary: "#ff0000", secondary: "#00ff00", accent: "#0000ff" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid hex color", () => {
    const result = profileUpdateSchema.safeParse({
      name: "Test",
      brandColors: { primary: "invalid", secondary: "#00ff00", accent: "#0000ff" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts partial update with just name", () => {
    const result = profileUpdateSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts social links array", () => {
    const result = profileUpdateSchema.safeParse({
      socialLinks: [{ platform: "twitter", url: "https://twitter.com/test" }],
    });
    expect(result.success).toBe(true);
  });
});
