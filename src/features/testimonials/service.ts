import { prisma } from "@/lib/prisma";
import type { TestimonialData, TestimonialFormInput } from "./types";

export const testimonialService = {
  async list(tenantId: string): Promise<TestimonialData[]> {
    const settings = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "testimonials" } },
    });
    const items = Array.isArray(settings?.value) ? settings.value as Record<string, unknown>[] : [];
    return items.map((item, i) => ({
      id: (item.id as string) ?? `testimonial-${i}`,
      author: item.author as string,
      role: (item.role as string) ?? null,
      content: item.content as string,
      avatarUrl: (item.avatarUrl as string) ?? null,
      rating: (item.rating as number) ?? 5,
      featured: (item.featured as boolean) ?? false,
      category: (item.category as string) ?? "general",
      sortOrder: i,
      isActive: true,
      createdAt: new Date(),
    }));
  },

  async create(tenantId: string, input: TestimonialFormInput): Promise<TestimonialData> {
    const settings = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "testimonials" } },
    });
    const items = Array.isArray(settings?.value) ? [...(settings.value as Record<string, unknown>[])] : [];
    const newItem = {
      id: `t_${Date.now()}`,
      author: input.author,
      role: input.role ?? null,
      content: input.content,
      avatarUrl: input.avatarUrl ?? null,
      rating: input.rating ?? 5,
      featured: input.featured ?? false,
      category: input.category ?? "general",
    };
    items.push(newItem);
    const sanitized = JSON.parse(JSON.stringify(items));
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: "testimonials" } },
      create: { tenantId, key: "testimonials", value: sanitized },
      update: { value: sanitized },
    });
    return {
      ...newItem,
      sortOrder: items.length - 1,
      isActive: true,
      createdAt: new Date(),
    } as TestimonialData;
  },

  async delete(tenantId: string, id: string): Promise<void> {
    const settings = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "testimonials" } },
    });
    const items = Array.isArray(settings?.value) ? (settings.value as Record<string, unknown>[]) : [];
    const filtered = items.filter((item) => item.id !== id);
    const sanitized = JSON.parse(JSON.stringify(filtered));
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: "testimonials" } },
      create: { tenantId, key: "testimonials", value: sanitized },
      update: { value: sanitized },
    });
  },

  async update(tenantId: string, id: string, input: TestimonialFormInput): Promise<TestimonialData> {
    const settings = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "testimonials" } },
    });
    const items = Array.isArray(settings?.value) ? [...(settings.value as Record<string, unknown>[])] : [];
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) throw new Error("Testimonial not found");

    items[index] = {
      ...items[index],
      author: input.author,
      role: input.role ?? null,
      content: input.content,
      avatarUrl: input.avatarUrl ?? null,
      rating: input.rating ?? 5,
      featured: input.featured ?? false,
      category: input.category ?? "general",
    };

    const sanitized = JSON.parse(JSON.stringify(items));
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: "testimonials" } },
      create: { tenantId, key: "testimonials", value: sanitized },
      update: { value: sanitized },
    });

    const updated = items[index] as unknown as TestimonialData;
    return {
      ...updated,
      sortOrder: index,
      isActive: true,
      createdAt: new Date(),
    } as TestimonialData;
  },
};
