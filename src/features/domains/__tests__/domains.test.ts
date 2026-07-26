import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTenantFindUnique, mockTenantUpdate } = vi.hoisted(() => ({
  mockTenantFindUnique: vi.fn(),
  mockTenantUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: mockTenantFindUnique,
      update: mockTenantUpdate,
    },
  },
}));

import { domainService } from "../service";

beforeEach(() => { vi.clearAllMocks(); });

describe("Domain service", () => {
  it("get returns domain data", async () => {
    mockTenantFindUnique.mockResolvedValue({ id: "t1", subdomain: "testcreator", customDomain: "example.com" });
    const result = await domainService.get("t1");
    expect(result.defaultSubdomain).toContain("testcreator");
    expect(result.customDomain).toBe("example.com");
    expect(result.sslStatus).toBe("active");
    expect(result.dnsInstructions.length).toBeGreaterThan(0);
  });

  it("get returns null ssl when no custom domain", async () => {
    mockTenantFindUnique.mockResolvedValue({ id: "t1", subdomain: "test", customDomain: null });
    const result = await domainService.get("t1");
    expect(result.customDomain).toBeNull();
    expect(result.sslStatus).toBeNull();
  });

  it("update sets custom domain", async () => {
    mockTenantFindUnique.mockResolvedValue({ id: "t1", subdomain: "test", customDomain: "newdomain.com" });
    mockTenantUpdate.mockResolvedValue({});
    const result = await domainService.update("t1", "newdomain.com");
    expect(result.customDomain).toBe("newdomain.com");
    expect(mockTenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "t1" }, data: { customDomain: "newdomain.com" } }),
    );
  });

  it("update strips protocol and trailing slash", async () => {
    mockTenantFindUnique.mockResolvedValue({ id: "t1", subdomain: "test", customDomain: "example.com" });
    mockTenantUpdate.mockResolvedValue({});
    await domainService.update("t1", "https://example.com/");
    expect(mockTenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { customDomain: "example.com" } }),
    );
  });

  it("remove clears custom domain", async () => {
    mockTenantFindUnique.mockResolvedValue({ id: "t1", subdomain: "test", customDomain: null });
    mockTenantUpdate.mockResolvedValue({});
    const result = await domainService.remove("t1");
    expect(result.customDomain).toBeNull();
    expect(mockTenantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "t1" }, data: { customDomain: null } }),
    );
  });

  it("get throws when tenant not found", async () => {
    mockTenantFindUnique.mockResolvedValue(null);
    await expect(domainService.get("nonexistent")).rejects.toThrow("Tenant not found");
  });
});
