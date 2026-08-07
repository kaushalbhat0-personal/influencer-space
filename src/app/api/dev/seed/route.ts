import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { seedDatabase } from "@/lib/testing/seed";
import { seedBillingCatalog } from "@/modules/billing/infrastructure/catalog-seed";

export async function POST() {
  // VALIDATION-05: previously the SUPER_ADMIN check ran ONLY in production —
  // any staging/preview deployment exposed an unauthenticated full DB reseed.
  if (process.env.NODE_ENV !== "development") {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "SUPER_ADMIN") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    await seedBillingCatalog();
    const result = await seedDatabase();
    return Response.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
