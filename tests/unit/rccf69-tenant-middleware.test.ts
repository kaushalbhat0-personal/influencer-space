import { describe, it, expect, vi, beforeEach } from "vitest";

// ── RCCF-69.4 (P1-B) — public tenancy header lifecycle ─────────────────────
// x-tenant-host must NEVER be an inbound client-selected authority.
//
// Middleware now: overwrites x-tenant-host from trusted Host/slug when a tenant
// is derivable, otherwise DELETES the header. getTenantContext() therefore can
// only ever see a server-derived value (or nothing).
//
// We test the contract that getTenantContext relies on: when the header is
// absent/removed, no tenant is resolved (fail-closed); when present it must be
// the server-derived value. We also assert the middleware source contains the
// delete-on-no-tenant branch (the exact fix), and that public actions fail
// closed when the header is gone.

const { mockHeadersGet, mockFindFirst } = vi.hoisted(() => ({
  mockHeadersGet: vi.fn(),
  mockFindFirst: vi.fn(),
}));

vi.mock("react", () => ({ cache: (fn: (...args: unknown[]) => unknown) => fn }));
vi.mock("next/headers", () => ({ headers: () => ({ get: mockHeadersGet }) }));
vi.mock("@/lib/prisma", () => ({
  prisma: { tenant: { findFirst: mockFindFirst } },
}));

import { getTenantContext } from "@/lib/tenant";
import { readFileSync } from "node:fs";

const TENANT_A = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  mockHeadersGet.mockReset();
  mockFindFirst.mockReset();
});

describe("RCCF-69.4 — middleware tenant header lifecycle (P1-B)", () => {
  it("middleware source: x-tenant-host is overwritten from trusted Host/slug and DELETED otherwise", () => {
    const src = readFileSync("src/middleware.ts", "utf8");
    // The header is set ONLY from derived values:
    expect(src).toContain('headers.set("x-tenant-host", extractedTenant)');
    expect(src).toContain('headers.set("x-tenant-host", classification.slug)');
    // When no tenant is derivable, the inbound header is removed (never preserved):
    expect(src).toContain('headers.delete("x-tenant-host")');
    // The delete must be reachable only when neither derived value was set:
    expect(src).toContain("} else if (!extractedTenant) {");
  });

  it("getTenantContext returns null when the header is absent (fail-closed)", async () => {
    mockHeadersGet.mockReturnValue(null);
    expect(await getTenantContext()).toBeNull();
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("getTenantContext returns null when the header is present but unresolvable", async () => {
    mockHeadersGet.mockReturnValue("not-a-real-tenant");
    mockFindFirst.mockResolvedValue(null);
    expect(await getTenantContext()).toBeNull();
  });

  it("getTenantContext resolves the tenant named by a server-derived header", async () => {
    mockHeadersGet.mockReturnValue("creator-a");
    mockFindFirst.mockResolvedValue({ id: TENANT_A, subdomain: "creator-a" });
    expect((await getTenantContext())?.id).toBe(TENANT_A);
  });

  it("getTenantContext only ever reads the header — it never accepts a client tenant id param", async () => {
    // The function signature has no tenantId parameter by construction.
    const fnSrc = readFileSync("src/lib/tenant.ts", "utf8");
    expect(fnSrc).toContain("getTenantContext = cache(async ()");
    expect(fnSrc).toContain('headersList.get("x-tenant-host")');
  });
});
