import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTenantFindFirst, mockContactCreate, mockNewsletterUpsert, mockHeaderGet } = vi.hoisted(() => ({
  mockTenantFindFirst: vi.fn(),
  mockContactCreate: vi.fn(),
  mockNewsletterUpsert: vi.fn(),
  mockHeaderGet: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findFirst: mockTenantFindFirst },
    contactSubmission: { create: mockContactCreate },
    newsletterSubscriber: { upsert: mockNewsletterUpsert },
  },
}));

vi.mock("next/headers", () => ({
  headers: () => ({ get: mockHeaderGet }),
}));

import { submitStorefrontContact, subscribeNewsletter } from "@/actions/storefront.actions";

const T1 = "11111111-1111-4111-8111-111111111111";
const T2 = "22222222-2222-4222-8222-222222222222";
const UNKNOWN = "00000000-0000-4000-8000-000000000001";

function contactForm(tenantId = T1) {
  const fd = new FormData();
  fd.set("tenantId", tenantId);
  fd.set("name", "Alice");
  fd.set("email", "alice@example.com");
  fd.set("message", "Hello there, I'd like to collaborate.");
  return fd;
}

function newsletterForm(tenantId = T1) {
  const fd = new FormData();
  fd.set("tenantId", tenantId);
  fd.set("email", "alice@example.com");
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTenantFindFirst.mockReset();
  mockHeaderGet.mockReset();
  mockContactCreate.mockReset();
  mockNewsletterUpsert.mockReset();
  mockTenantFindFirst.mockResolvedValue({ id: T1 });
  mockContactCreate.mockResolvedValue({ id: "c1" });
  mockNewsletterUpsert.mockResolvedValue({ id: "n1" });
  mockHeaderGet.mockReturnValue("owais");
});

describe("submitStorefrontContact — RCCF-19/25 tenant boundary", () => {
  it("accepts the tenant served at the storefront host (platform root /{slug})", async () => {
    const res = await submitStorefrontContact({ success: false }, contactForm(T1));

    expect(res.success).toBe(true);
    expect(mockContactCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: T1, email: "alice@example.com" }) }),
    );
  });

  it("accepts the tenant on a nested platform route (/{slug}/{pageSlug} with x-tenant-host set)", async () => {
    // The nested route now carries x-tenant-host = the tenant slug (routes.ts
    // classifies /{slug}/{pageSlug} as PublicStorefront). Same tenant => success.
    const res = await submitStorefrontContact({ success: false }, contactForm(T1));

    expect(res.success).toBe(true);
    expect(mockContactCreate).toHaveBeenCalled();
  });

  it("rejects a cross-tenant submission with zero side effects", async () => {
    const res = await submitStorefrontContact({ success: false }, contactForm(T2));

    expect(res.success).toBe(false);
    expect(res.error).toBe("Invalid tenant");
    expect(mockContactCreate).not.toHaveBeenCalled();
  });

  it("rejects an unknown tenant (mismatch with the served host)", async () => {
    const res = await submitStorefrontContact({ success: false }, contactForm(UNKNOWN));

    expect(res.success).toBe(false);
    expect(res.error).toBe("Invalid tenant");
    expect(mockContactCreate).not.toHaveBeenCalled();
  });

  it("rejects when the storefront host header is absent (no existence-only fallback)", async () => {
    mockHeaderGet.mockReturnValue(null);

    const res = await submitStorefrontContact({ success: false }, contactForm(T1));

    expect(res.success).toBe(false);
    expect(res.error).toBe("Invalid tenant");
    expect(mockContactCreate).not.toHaveBeenCalled();
  });

  it("rejects when the host does not resolve to a tenant", async () => {
    mockTenantFindFirst.mockResolvedValue(null);

    const res = await submitStorefrontContact({ success: false }, contactForm(T1));

    expect(res.success).toBe(false);
    expect(res.error).toBe("Invalid tenant");
    expect(mockContactCreate).not.toHaveBeenCalled();
  });

  it("accepts a custom-domain host (x-tenant-host = custom domain)", async () => {
    mockHeaderGet.mockReturnValue("alice.example.com");

    const res = await submitStorefrontContact({ success: false }, contactForm(T1));

    expect(res.success).toBe(true);
  });

  it("accepts a subdomain host (x-tenant-host = subdomain)", async () => {
    mockHeaderGet.mockReturnValue("owais");

    const res = await submitStorefrontContact({ success: false }, contactForm(T1));

    expect(res.success).toBe(true);
  });
});

describe("subscribeNewsletter — RCCF-19/25 tenant boundary", () => {
  it("accepts the tenant served at the storefront host", async () => {
    const res = await subscribeNewsletter({ success: false }, newsletterForm(T1));

    expect(res.success).toBe(true);
    expect(mockNewsletterUpsert).toHaveBeenCalled();
  });

  it("rejects a cross-tenant submission with zero side effects", async () => {
    const res = await subscribeNewsletter({ success: false }, newsletterForm(T2));

    expect(res.success).toBe(false);
    expect(res.error).toBe("Invalid tenant");
    expect(mockNewsletterUpsert).not.toHaveBeenCalled();
  });

  it("rejects when the storefront host header is absent", async () => {
    mockHeaderGet.mockReturnValue(null);

    const res = await subscribeNewsletter({ success: false }, newsletterForm(T1));

    expect(res.success).toBe(false);
    expect(mockNewsletterUpsert).not.toHaveBeenCalled();
  });
});