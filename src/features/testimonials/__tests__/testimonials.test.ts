import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSettingFindUnique, mockSettingUpsert } = vi.hoisted(() => ({
  mockSettingFindUnique: vi.fn(),
  mockSettingUpsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    setting: {
      findUnique: mockSettingFindUnique,
      upsert: mockSettingUpsert,
    },
  },
}));

import { testimonialService } from "../service";
import { testimonialFormSchema } from "../validators";

beforeEach(() => { vi.clearAllMocks(); });

describe("Testimonial validators", () => {
  it("accepts valid testimonial", () => {
    const result = testimonialFormSchema.safeParse({ author: "John", content: "Great product!" });
    expect(result.success).toBe(true);
  });

  it("rejects missing author", () => {
    const result = testimonialFormSchema.safeParse({ content: "Great!" });
    expect(result.success).toBe(false);
  });

  it("rejects missing content", () => {
    const result = testimonialFormSchema.safeParse({ author: "John" });
    expect(result.success).toBe(false);
  });

  it("accepts optional rating", () => {
    const result = testimonialFormSchema.safeParse({ author: "John", content: "Great!", rating: 5 });
    expect(result.success).toBe(true);
  });
});

describe("Testimonial service", () => {
  it("list returns empty when no setting", async () => {
    mockSettingFindUnique.mockResolvedValue(null);
    const result = await testimonialService.list("t1");
    expect(result).toHaveLength(0);
  });

  it("list returns parsed testimonials", async () => {
    mockSettingFindUnique.mockResolvedValue({ key: "testimonials", value: [{ id: "1", author: "John", content: "Great!" }] });
    const result = await testimonialService.list("t1");
    expect(result).toHaveLength(1);
    expect(result[0].author).toBe("John");
  });

  it("create adds testimonial to setting", async () => {
    mockSettingFindUnique.mockResolvedValue(null);
    mockSettingUpsert.mockResolvedValue({});
    const result = await testimonialService.create("t1", { author: "Jane", content: "Amazing!" });
    expect(result.author).toBe("Jane");
    expect(result.content).toBe("Amazing!");
    expect(mockSettingUpsert).toHaveBeenCalled();
  });

  it("delete removes testimonial", async () => {
    mockSettingFindUnique.mockResolvedValue({ key: "testimonials", value: [{ id: "1", author: "John", content: "Great!" }] });
    mockSettingUpsert.mockResolvedValue({});
    await testimonialService.delete("t1", "1");
    expect(mockSettingUpsert).toHaveBeenCalled();
  });
});
