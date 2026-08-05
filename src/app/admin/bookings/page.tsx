import { requireTenant } from "@/lib/auth/require-tenant";
import { prisma } from "@/lib/prisma";
import { BookingsClient } from "./_components/bookings-client";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const { tenantId } = await requireTenant();
  const bookings = await prisma.booking.findMany({
    where: { tenantId },
    orderBy: { slotDate: "asc" },
  });
  return <BookingsClient initialBookings={bookings} tenantId={tenantId} />;
}
