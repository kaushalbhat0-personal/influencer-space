import { prisma } from "@/lib/prisma";

export async function productsDataLoader(
  tenantId: string,
  _config: Record<string, unknown>,
  _context: Record<string, unknown>
) {
  void _config; void _context;
  return prisma.product.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true, description: true, price: true, imageUrl: true },
  });
}
