import { describe, it, expect } from "vitest";
import { verifyBearerAuth } from "@/lib/security/verify-bearer";

function req(authorization: string | null): Request {
  return new Request("http://localhost/api/cron/x", {
    headers: authorization === null ? {} : { authorization },
  });
}

const SECRET = "s3cr3t-cron-token-0123456789";

describe("verifyBearerAuth — RCCF-72.17A SEC-08", () => {
  it("accepts the correct Bearer token", () => {
    expect(verifyBearerAuth(req(`Bearer ${SECRET}`), SECRET)).toBe(true);
  });

  it("rejects a wrong token", () => {
    expect(verifyBearerAuth(req("Bearer wrong-token"), SECRET)).toBe(false);
  });

  it("rejects a token with the correct prefix but wrong body", () => {
    expect(verifyBearerAuth(req(`Bearer ${SECRET}x`), SECRET)).toBe(false);
  });

  it("rejects a missing authorization header", () => {
    expect(verifyBearerAuth(req(null), SECRET)).toBe(false);
  });

  it("rejects a non-Bearer scheme", () => {
    expect(verifyBearerAuth(req(`Token ${SECRET}`), SECRET)).toBe(false);
  });

  it("fails closed when the expected secret is unset (empty env)", () => {
    // Without this guard, `Bearer ` + "" collapses to `Bearer ` which any
    // caller could send verbatim.
    expect(verifyBearerAuth(req(`Bearer ${SECRET}`), undefined)).toBe(false);
    expect(verifyBearerAuth(req("Bearer "), "")).toBe(false);
  });

  it("rejects when the header is only the scheme with no token", () => {
    expect(verifyBearerAuth(req("Bearer "), SECRET)).toBe(false);
  });
});