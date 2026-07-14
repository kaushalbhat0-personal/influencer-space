import { prisma } from "@/lib/prisma";

export type ContactData = {
  id: string;
  name: string;
  email: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
};

export const ContactService = {
  async create(
    tenantId: string,
    data: {
      name: string;
      email: string;
      message: string;
    },
  ): Promise<ContactData> {
    return prisma.contactSubmission.create({
      data: {
        tenantId,
        name: data.name,
        email: data.email,
        message: data.message,
        isRead: false,
      },
    });
  },

  async findAll(tenantId: string): Promise<ContactData[]> {
    return prisma.contactSubmission.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string, tenantId: string): Promise<ContactData | null> {
    return prisma.contactSubmission.findFirst({
      where: { id, tenantId },
    });
  },

  async markAsRead(id: string, tenantId: string): Promise<ContactData> {
    const existing = await prisma.contactSubmission.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new Error("Message not found");
    return prisma.contactSubmission.update({
      where: { id },
      data: { isRead: true },
    });
  },

  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await prisma.contactSubmission.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new Error("Message not found");
    await prisma.contactSubmission.delete({ where: { id } });
  },
};
