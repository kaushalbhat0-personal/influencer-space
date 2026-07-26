/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import {
  createDraftToken, validateDraftToken,
  isDraftRequest, getDraftPreviewUrl,
} from "../draft";

describe("draft tokens", () => {
  it("creates a draft token with base64 encoding", () => {
    const token = createDraftToken("t1");
    expect(token.token).toBeTruthy();
    expect(token.tenantId).toBe("t1");
    expect(token.expiresAt > new Date()).toBe(true);
    expect(token.token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("validates correct draft token", () => {
    const stored = createDraftToken("t1");
    expect(validateDraftToken(stored.token, stored)).toBe(true);
  });

  it("rejects invalid format", () => {
    const stored = createDraftToken("t1");
    expect(validateDraftToken("invalid===", stored)).toBe(false);
  });

  it("rejects expired token", () => {
    const stored = createDraftToken("t1");
    stored.expiresAt = new Date(Date.now() - 1000);
    expect(validateDraftToken(stored.token, stored)).toBe(false);
  });

  it("rejects wrong token for tenant", () => {
    const stored = createDraftToken("t1");
    const other = createDraftToken("t2");
    expect(validateDraftToken(other.token, stored)).toBe(false);
  });
});

describe("isDraftRequest", () => {
  it("detects draft request with token", () => {
    const params = new URLSearchParams("preview=draft&token=abc123");
    expect(isDraftRequest(params)).toBe(true);
  });

  it("returns false without preview param", () => {
    const params = new URLSearchParams("token=abc123");
    expect(isDraftRequest(params)).toBe(false);
  });

  it("returns false without token", () => {
    const params = new URLSearchParams("preview=draft");
    expect(isDraftRequest(params)).toBe(false);
  });

  it("returns false for non-draft preview", () => {
    const params = new URLSearchParams("preview=published&token=abc123");
    expect(isDraftRequest(params)).toBe(false);
  });
});

describe("getDraftPreviewUrl", () => {
  it("generates URL with draft params", () => {
    const url = getDraftPreviewUrl("example.com", "tok123");
    expect(url).toContain("preview=draft");
    expect(url).toContain("token=tok123");
  });

  it("encodes token", () => {
    const url = getDraftPreviewUrl("example.com", "tok/123");
    expect(url).toContain("token=");
  });
});
