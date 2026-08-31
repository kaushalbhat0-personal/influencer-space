"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { legalService, type LegalPageKey } from "@/lib/legal/service";
import { afterContentChange } from "@/lib/publishing/content-change";
import { assertAgencyOwnsTenant } from "@/modules/partner/application/authorization";

export async function getLegal(page: LegalPageKey) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return legalService.get(tenantId, page);
}
export async function updateLegal(page: LegalPageKey, title: string, content: string) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  const res = await legalService.update(tenantId, page, { title, content });
  revalidatePath("/admin/legal");
  await afterContentChange(tenantId);
  return res;
}
export async function agencyGetLegal(tenantId: string, page: LegalPageKey) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) throw new Error("Unauthorized");
  const owned = await assertAgencyOwnsTenant(session.user.id, session.user.agencyId, tenantId);
  if (!owned.ok) throw new Error(owned.error ?? "Forbidden");
  return legalService.get(tenantId, page);
}
export async function agencyUpdateLegal(tenantId: string, page: LegalPageKey, title: string, content: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) throw new Error("Unauthorized");
  const owned = await assertAgencyOwnsTenant(session.user.id, session.user.agencyId, tenantId);
  if (!owned.ok) throw new Error(owned.error ?? "Forbidden");
  const res = await legalService.update(tenantId, page, { title, content });
  await afterContentChange(tenantId);
  return res;
}
