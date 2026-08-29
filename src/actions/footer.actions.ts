"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { footerService } from "@/lib/footer/service";
import { siteSocialService } from "@/lib/site-social/service";
import { publishingService } from "@/lib/publishing/service";
import type { FooterColumn } from "@/types/snapshot";
import type { HeroSocialLink } from "@/config/hero";

async function requireTenant(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  return session.user.tenantId;
}

export async function getFooterConfig(): Promise<{ success: boolean; data?: { description: string | null; copyright: string | null; columns: FooterColumn[]; socialLinks: HeroSocialLink[] }; error?: string }> {
  try {
    const tenantId = await requireTenant();
    const [footer, socialLinks] = await Promise.all([
      footerService.getOrDefaults(tenantId),
      siteSocialService.resolve(tenantId),
    ]);
    return { success: true, data: { description: footer.description, copyright: footer.copyright, columns: footer.columns, socialLinks } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load footer" };
  }
}

export async function saveFooterConfig(input: { description?: string | null; copyright?: string | null; columns?: FooterColumn[] }): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await requireTenant();
    await footerService.save(tenantId, { description: input.description ?? null, copyright: input.copyright ?? null, columns: input.columns });
    await publishingService.markChangesPending(tenantId).catch(() => {});
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save footer" };
  }
}

export async function saveFooterSocialLinks(links: HeroSocialLink[]): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await requireTenant();
    await siteSocialService.save(tenantId, links);
    await publishingService.markChangesPending(tenantId).catch(() => {});
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save social links" };
  }
}
