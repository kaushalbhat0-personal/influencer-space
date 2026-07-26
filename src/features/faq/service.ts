import { prisma } from "@/lib/prisma";
import type { FAQItemData, FAQFormInput } from "./types";

export const faqService = {
  async list(tenantId: string): Promise<FAQItemData[]> {
    const settings = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "faq" } },
    });
    const items = Array.isArray(settings?.value) ? settings.value as Record<string, unknown>[] : [];
    return items.map((item, i) => ({
      id: (item.id as string) ?? `faq-${i}`,
      question: item.question as string,
      answer: item.answer as string,
      category: (item.category as string) ?? "general",
      sortOrder: i,
      isActive: true,
    }));
  },

  async create(tenantId: string, input: FAQFormInput): Promise<FAQItemData> {
    const settings = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "faq" } },
    });
    const items = Array.isArray(settings?.value) ? [...(settings.value as Record<string, unknown>[])] : [];
    const newItem = { id: `faq_${Date.now()}`, question: input.question, answer: input.answer, category: input.category ?? "general" };
    items.push(newItem);
    const sanitized = JSON.parse(JSON.stringify(items));
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: "faq" } },
      create: { tenantId, key: "faq", value: sanitized },
      update: { value: sanitized },
    });
    return { ...newItem, sortOrder: items.length - 1, isActive: true } as FAQItemData;
  },

  async delete(tenantId: string, id: string): Promise<void> {
    const settings = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "faq" } },
    });
    const items = Array.isArray(settings?.value) ? (settings.value as Record<string, unknown>[]) : [];
    const filtered = items.filter((item) => item.id !== id);
    const sanitized = JSON.parse(JSON.stringify(filtered));
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: "faq" } },
      create: { tenantId, key: "faq", value: sanitized },
      update: { value: sanitized },
    });
  },
};
