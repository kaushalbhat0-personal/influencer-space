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
  async create(data: {
    name: string;
    email: string;
    message: string;
  }): Promise<ContactData> {
    return prisma.contactSubmission.create({
      data: {
        name: data.name,
        email: data.email,
        message: data.message,
        isRead: false,
      },
    });
  },

  async findAll(): Promise<ContactData[]> {
    return prisma.contactSubmission.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string): Promise<ContactData | null> {
    return prisma.contactSubmission.findUnique({ where: { id } });
  },

  async markAsRead(id: string): Promise<ContactData> {
    return prisma.contactSubmission.update({
      where: { id },
      data: { isRead: true },
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.contactSubmission.delete({ where: { id } });
  },
};
