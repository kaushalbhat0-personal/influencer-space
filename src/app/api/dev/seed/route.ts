import { seedDatabase } from "@/lib/testing/seed";
import { seedBillingCatalog } from "@/lib/billing/catalog-seed";

export async function POST() {
  try {
    await seedBillingCatalog();
    const result = await seedDatabase();
    return Response.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
