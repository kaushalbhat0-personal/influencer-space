/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getPreviewState, setPreviewState, resetPreviewState,
  generatePreviewToken, validatePreviewToken,
  getPreviewUrl, PreviewMode,
} from "../preview";

describe("PreviewState", () => {
  beforeEach(() => resetPreviewState());

  it("starts inactive", () => {
    const state = getPreviewState();
    expect(state.active).toBe(false);
    expect(state.mode).toBe("draft");
    expect(state.token).toBeNull();
    expect(state.compareVersion).toBeNull();
  });

  it("updates state partially", () => {
    setPreviewState({ active: true, mode: "published" });
    const state = getPreviewState();
    expect(state.active).toBe(true);
    expect(state.mode).toBe("published");
  });

  it("reset clears state", () => {
    setPreviewState({ active: true, mode: "compare", compareVersion: 5 });
    resetPreviewState();
    expect(getPreviewState().active).toBe(false);
    expect(getPreviewState().compareVersion).toBeNull();
  });

  it("preserves unset fields on partial update", () => {
    setPreviewState({ active: true });
    const state = getPreviewState();
    expect(state.mode).toBe("draft");
  });
});

describe("preview tokens", () => {
  it("generates a token with expiration", () => {
    const token = generatePreviewToken("t1", 3);
    expect(token.token).toBeTruthy();
    expect(token.tenantId).toBe("t1");
    expect(token.version).toBe(3);
    expect(token.expiresAt > new Date()).toBe(true);
  });

  it("generates token without version", () => {
    const token = generatePreviewToken("t1");
    expect(token.version).toBeNull();
  });

  it("validates matching token", () => {
    const token = generatePreviewToken("t1");
    expect(validatePreviewToken(token.token, token)).toBe(true);
  });

  it("rejects wrong token", () => {
    const token = generatePreviewToken("t1");
    expect(validatePreviewToken("wrong", token)).toBe(false);
  });

  it("rejects expired token", () => {
    const token = generatePreviewToken("t1");
    token.expiresAt = new Date(Date.now() - 1000);
    expect(validatePreviewToken(token.token, token)).toBe(false);
  });
});

describe("getPreviewUrl", () => {
  it("generates preview URL with mode", () => {
    const url = getPreviewUrl("example.com", "draft", "tok123");
    expect(url).toContain("preview=draft");
    expect(url).toContain("token=tok123");
  });

  it("generates preview URL without token", () => {
    const url = getPreviewUrl("example.com", "published");
    expect(url).toContain("preview=published");
    expect(url).not.toContain("token=");
  });
});
