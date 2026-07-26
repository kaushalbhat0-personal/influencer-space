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

import { faqService } from "../service";
import { faqFormSchema } from "../validators";

beforeEach(() => { vi.clearAllMocks(); });

describe("FAQ validators", () => {
  it("accepts valid faq item", () => {
    const result = faqFormSchema.safeParse({ question: "What?", answer: "Answer" });
    expect(result.success).toBe(true);
  });

  it("rejects missing question", () => {
    const result = faqFormSchema.safeParse({ answer: "Answer" });
    expect(result.success).toBe(false);
  });

  it("rejects missing answer", () => {
    const result = faqFormSchema.safeParse({ question: "What?" });
    expect(result.success).toBe(false);
  });
});

describe("FAQ service", () => {
  it("list returns empty when no setting", async () => {
    mockSettingFindUnique.mockResolvedValue(null);
    const result = await faqService.list("t1");
    expect(result).toHaveLength(0);
  });

  it("list returns parsed faq items", async () => {
    mockSettingFindUnique.mockResolvedValue({ key: "faq", value: [{ id: "1", question: "What?", answer: "Answer" }] });
    const result = await faqService.list("t1");
    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("What?");
  });

  it("create adds faq item", async () => {
    mockSettingFindUnique.mockResolvedValue(null);
    mockSettingUpsert.mockResolvedValue({});
    const result = await faqService.create("t1", { question: "How?", answer: "Like this" });
    expect(result.question).toBe("How?");
    expect(result.answer).toBe("Like this");
  });

  it("delete removes faq item", async () => {
    mockSettingFindUnique.mockResolvedValue({ key: "faq", value: [{ id: "1", question: "What?", answer: "Answer" }] });
    mockSettingUpsert.mockResolvedValue({});
    await faqService.delete("t1", "1");
    expect(mockSettingUpsert).toHaveBeenCalled();
  });
});
