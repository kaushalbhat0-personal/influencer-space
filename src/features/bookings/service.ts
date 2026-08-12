import { prisma } from "@/lib/prisma";
import { enforceContentLimit } from "@/modules/billing/application/content-limit.enforcement";
import { FEATURE_IDS } from "@/lib/capabilities/constants";

export interface BookingSlot {
  id: string;
  date: Date;
  start: string;
  end: string;
  available: boolean;
}

export interface CreateBookingInput {
  tenantId: string;
  title: string;
  description?: string;
  price?: number;
  duration?: number;
  slotDate: Date;
  slotStart?: string;
  slotEnd?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  approvalRequired?: boolean;
}

export const bookingService = {
  async create(input: CreateBookingInput) {
    const limit = await enforceContentLimit({ tenantId: input.tenantId, featureKey: FEATURE_IDS.BOOKINGS });
    if (!limit.ok) throw new Error(limit.reason);
    return prisma.booking.create({
      data: {
        tenantId: input.tenantId,
        title: input.title,
        description: input.description,
        price: input.price ?? 0,
        duration: input.duration ?? 60,
        slotDate: input.slotDate,
        slotStart: input.slotStart ?? "09:00",
        slotEnd: input.slotEnd ?? "10:00",
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        notes: input.notes,
        approvalRequired: input.approvalRequired ?? true,
        status: input.approvalRequired === false ? "confirmed" : "pending",
      },
    });
  },

  async getByTenant(tenantId: string, status?: string) {
    return prisma.booking.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: { slotDate: "asc" },
    });
  },

  async getById(id: string) {
    return prisma.booking.findUnique({ where: { id } });
  },

  async approve(id: string) {
    return prisma.booking.update({ where: { id }, data: { status: "confirmed", approvedAt: new Date() } });
  },

  async cancel(id: string) {
    return prisma.booking.update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date() } });
  },

  async getSlots(tenantId: string, date: Date) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    const bookings = await prisma.booking.findMany({
      where: { tenantId, slotDate: { gte: start, lt: end }, status: { in: ["pending", "confirmed"] } },
    });
    const bookedSlots = bookings.map((b: { slotStart: string; slotEnd: string }) => ({ start: b.slotStart, end: b.slotEnd }));
    return Array.from({ length: 10 }, (_unused, i) => {
      const h = 9 + i;
      const start = `${String(h).padStart(2, "0")}:00`;
      const end = `${String(h + 1).padStart(2, "0")}:00`;
      return { id: `slot-${h}`, date, start, end, available: !bookedSlots.some((s: { start: string }) => s.start === start) };
    });
  },

  async getStats(tenantId: string) {
    const [total, confirmed, pending, revenue] = await Promise.all([
      prisma.booking.count({ where: { tenantId } }),
      prisma.booking.count({ where: { tenantId, status: "confirmed" } }),
      prisma.booking.count({ where: { tenantId, status: "pending" } }),
      prisma.booking.aggregate({ where: { tenantId, status: "confirmed" }, _sum: { price: true } }),
    ]);
    return { total, confirmed, pending, revenue: revenue._sum.price ?? 0 };
  },
};
