import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockOfferingFindMany, mockOfferingCreate } = vi.hoisted(() => ({
  mockOfferingFindMany: vi.fn(),
  mockOfferingCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    offering: {
      findMany: mockOfferingFindMany,
      create: mockOfferingCreate,
    },
  },
}));

import { serviceService } from "../service";
import { serviceFormSchema } from "../validators";

beforeEach(() => { vi.clearAllMocks(); });

describe("Service validators", () => {
  it("accepts valid service", () => {
    const result = serviceFormSchema.safeParse({ title: "Coaching", price: 500 });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = serviceFormSchema.safeParse({ price: 500 });
    expect(result.success).toBe(false);
  });
});

describe("Service service", () => {
  it("list returns offerings of type coaching", async () => {
    mockOfferingFindMany.mockResolvedValue([
      { id: "1", title: "Coaching", description: "1-on-1", price: 500, status: "published", slug: "coaching", type: "coaching", currency: "INR", createdAt: new Date(), updatedAt: new Date(), metadata: {}, tenantId: "t1" },
    ]);
    const result = await serviceService.list("t1");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Coaching");
  });

  it("create creates offering", async () => {
    mockOfferingCreate.mockResolvedValue({ id: "1", title: "New Service", description: null, price: 299, status: "draft", slug: "new-service", type: "coaching", currency: "INR", createdAt: new Date(), updatedAt: new Date(), metadata: {}, tenantId: "t1" });
    const result = await serviceService.create("t1", { title: "New Service", price: 299 });
    expect(result.title).toBe("New Service");
    expect(result.price).toBe(299);
  });
});
