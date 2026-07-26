import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface CreateUserData {
  tenantId: string;
  name: string;
  email: string;
  password: string;
  role: string;
}

export class UserRepository {
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  async create(data: CreateUserData, tx?: Prisma.TransactionClient) {
    return this.client(tx).user.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role as never,
      },
    });
  }

  async findFirstByTenantId(tenantId: string, tx?: Prisma.TransactionClient) {
    return this.client(tx).user.findFirst({
      where: { tenantId },
      select: { id: true },
    });
  }
}

export const userRepository = new UserRepository();
