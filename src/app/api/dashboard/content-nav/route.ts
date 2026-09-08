import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDynamicContentNavWithAddSection } from "@/lib/navigation/dynamic-content";

export async function GET() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return NextResponse.json({ items: [] }, { status: 401 });
  try {
    const items = await getDynamicContentNavWithAddSection(tenantId);
    return NextResponse.json({ items: items.map((i) => ({ label: i.label, href: i.href })) });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
