import { NextRequest, NextResponse } from "next/server";
import { getStorefrontData } from "@/lib/storefront/storefront-loader";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || "3-all-day";
  try {
    const data = await getStorefrontData(slug);
    return NextResponse.json({ slug, hasData: !!data, tenantId: data?.tenantId, hasSnapshot: !!data?.snapshot, previewAuthorized: data?.previewAuthorized });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
