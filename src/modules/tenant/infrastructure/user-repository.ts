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

  async update(id: string, data: { tenantId?: string; role?: string }, tx?: Prisma.TransactionClient) {
    return this.client(tx).user.update({
      where: { id },
      data: {
        ...(data.tenantId !== undefined && { tenantId: data.tenantId }),
        ...(data.role !== undefined && { role: data.role as never }),
      },
    });
  }

  /**
   * Safe update — prevents mutation of SUPER_ADMIN platform users.
   * Throws if the target user is SUPER_ADMIN and the update would change role or tenantId.
   */
  async safeUpdate(id: string, data: { tenantId?: string; role?: string }, tx?: Prisma.TransactionClient, ...protectedRoles: string[]) {
    const existing = await this.client(tx).user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!existing) {
      throw new Error(`Cannot update user ${id}: user not found`);
    }
    const rolesToProtect = protectedRoles.length > 0 ? protectedRoles : ["SUPER_ADMIN"];
    if (rolesToProtect.includes(existing.role) && (data.role !== undefined || data.tenantId !== undefined)) {
      throw new Error(
        `Cannot update user ${id}: role "${existing.role}" is protected from mutation. ` +
        `Attempted to set role="${data.role ?? "(unchanged)"}" tenantId="${data.tenantId ?? "(unchanged)"}"`,
      );
    }
    return this.client(tx).user.update({
      where: { id },
      data: {
        ...(data.tenantId !== undefined && { tenantId: data.tenantId }),
        ...(data.role !== undefined && { role: data.role as never }),
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
