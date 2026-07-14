import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockHeadersGet, mockFindFirst } = vi.hoisted(() => ({
  mockHeadersGet: vi.fn(),
  mockFindFirst: vi.fn(),
}));

vi.mock("react", () => ({
  cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("next/headers", () => ({
  headers: () => ({
    get: mockHeadersGet,
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: {
      findFirst: mockFindFirst,
    },
  },
}));

import { getTenantContext } from "@/lib/tenant";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTenantContext", () => {
  it("returns null when x-tenant-host header is missing", async () => {
    mockHeadersGet.mockReturnValue(null);

    const result = await getTenantContext();

    expect(result).toBeNull();
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("returns null when x-tenant-host header is an empty string", async () => {
    mockHeadersGet.mockReturnValue("");

    const result = await getTenantContext();

    expect(result).toBeNull();
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("queries tenant by subdomain when header is present", async () => {
    mockHeadersGet.mockReturnValue("snax");
    const tenant = {
      id: "t1",
      name: "S8UL Snax",
      subdomain: "snax",
      customDomain: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockFindFirst.mockResolvedValueOnce(tenant);

    const result = await getTenantContext();

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ subdomain: "snax" }, { customDomain: "snax" }],
      },
    });
    expect(result).toEqual(tenant);
  });

  it("queries tenant by customDomain when header is a full domain", async () => {
    mockHeadersGet.mockReturnValue("creatorx.com");
    const tenant = {
      id: "t2",
      name: "Creator X",
      subdomain: "creatorx",
      customDomain: "creatorx.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockFindFirst.mockResolvedValueOnce(tenant);

    const result = await getTenantContext();

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ subdomain: "creatorx.com" }, { customDomain: "creatorx.com" }],
      },
    });
    expect(result).toEqual(tenant);
  });

  it("returns null when no tenant matches the header value", async () => {
    mockHeadersGet.mockReturnValue("nonexistent");
    mockFindFirst.mockResolvedValueOnce(null);

    const result = await getTenantContext();

    expect(result).toBeNull();
  });
});
