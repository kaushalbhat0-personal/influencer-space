import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTenantFindUnique, mockTenantFindFirst, mockContactCreate, mockNewsletterUpsert, mockHeaderGet } = vi.hoisted(() => ({
  mockTenantFindUnique: vi.fn(),
  mockTenantFindFirst: vi.fn(),
  mockContactCreate: vi.fn(),
  mockNewsletterUpsert: vi.fn(),
  mockHeaderGet: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findUnique: mockTenantFindUnique, findFirst: mockTenantFindFirst },
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
  mockTenantFindUnique.mockReset();
  mockTenantFindFirst.mockReset();
  mockHeaderGet.mockReset();
  mockContactCreate.mockReset();
  mockNewsletterUpsert.mockReset();
  mockTenantFindUnique.mockResolvedValue({ subdomain: "owais", customDomain: null });
  mockTenantFindFirst.mockResolvedValue({ id: T1 });
  mockContactCreate.mockResolvedValue({ id: "c1" });
  mockNewsletterUpsert.mockResolvedValue({ id: "n1" });
  mockHeaderGet.mockReturnValue("owais");
});

describe("submitStorefrontContact — RCCF-19 P1-C", () => {
  it("succeeds when the submitted tenant matches the storefront host", async () => {
    const res = await submitStorefrontContact({ success: false }, contactForm());

    expect(res.success).toBe(true);
    expect(mockContactCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: T1, email: "alice@example.com" }) }),
    );
  });

  it("succeeds without a storefront host header (existence-check fallback)", async () => {
    mockHeaderGet.mockReturnValue(null);

    const res = await submitStorefrontContact({ success: false }, contactForm());

    expect(res.success).toBe(true);
  });

  it("rejects an unknown tenant", async () => {
    mockTenantFindUnique.mockResolvedValue(null);

    const res = await submitStorefrontContact({ success: false }, contactForm(UNKNOWN));

    expect(res.success).toBe(false);
    expect(res.error).toBe("Invalid tenant");
    expect(mockContactCreate).not.toHaveBeenCalled();
  });

  it("rejects a cross-tenant submission (host resolves to a different tenant)", async () => {
    mockTenantFindFirst.mockResolvedValue({ id: T2 });

    const res = await submitStorefrontContact({ success: false }, contactForm(T1));

    expect(res.success).toBe(false);
    expect(res.error).toBe("Invalid tenant");
    expect(mockContactCreate).not.toHaveBeenCalled();
  });
});

describe("subscribeNewsletter — RCCF-19 P1-C", () => {
  it("succeeds when the submitted tenant matches the storefront host", async () => {
    const res = await subscribeNewsletter({ success: false }, newsletterForm());

    expect(res.success).toBe(true);
    expect(mockNewsletterUpsert).toHaveBeenCalled();
  });

  it("rejects a cross-tenant submission", async () => {
    mockTenantFindFirst.mockResolvedValue({ id: T2 });

    const res = await subscribeNewsletter({ success: false }, newsletterForm(T1));

    expect(res.success).toBe(false);
    expect(res.error).toBe("Invalid tenant");
    expect(mockNewsletterUpsert).not.toHaveBeenCalled();
  });
});