import { describe, it, expect } from "vitest";
import { normalizeAssetId, filterValidAssetIds } from "@/lib/media/resolve";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("resolveAsset / normalizeAssetId", () => {
  it("passes through a valid uuid", () => {
    expect(normalizeAssetId(VALID_UUID)).toBe(VALID_UUID);
  });

  it("normalizes empty string to null (never query Prisma with \"\")", () => {
    expect(normalizeAssetId("")).toBeNull();
  });

  it("normalizes undefined and null to null", () => {
    expect(normalizeAssetId(undefined)).toBeNull();
    expect(normalizeAssetId(null)).toBeNull();
  });

  it("normalizes the string literals \"null\" and \"undefined\" to null", () => {
    expect(normalizeAssetId("null")).toBeNull();
    expect(normalizeAssetId("undefined")).toBeNull();
  });

  it("normalizes whitespace-padded empty strings to null", () => {
    expect(normalizeAssetId("   ")).toBeNull();
  });

  it("rejects malformed/non-uuid strings", () => {
    expect(normalizeAssetId("not-a-uuid")).toBeNull();
    expect(normalizeAssetId("abc")).toBeNull();
    expect(normalizeAssetId("123")).toBeNull();
  });

  it("accepts an uppercase uuid", () => {
    expect(normalizeAssetId(VALID_UUID.toUpperCase())).toBe(VALID_UUID.toUpperCase());
  });
});

describe("filterValidAssetIds", () => {
  it("drops empty, null, and invalid ids — the exact production failure input", () => {
    const result = filterValidAssetIds([VALID_UUID, "", null, undefined, "null", "garbage", "  "]);
    expect(result).toEqual([VALID_UUID]);
  });

  it("returns an empty array when nothing is valid", () => {
    expect(filterValidAssetIds(["", null])).toEqual([]);
  });
});
