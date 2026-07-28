"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { publishingService } from "@/lib/publishing/service";

export async function createWebsite(formData: FormData): Promise<{
  success: boolean;
  websiteId?: string;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;
    if (!tenantId) return { success: false, error: "Unauthorized" };

    const themeId = formData.get("themeId") as string || "com.creatos.neon-dark";

    // 1. Update website with blueprint and theme
    const website = await prisma.website.findUnique({ where: { tenantId } });
    if (!website) return { success: false, error: "Website not found" };

    await prisma.website.update({
      where: { id: website.id },
      data: {
        themePackageId: themeId,
      },
    });

    // 2. Apply theme via publishing (publish resolves theme from ThemeRegistry)
    const result = await publishingService.publish(tenantId);
    if (!result.success) return { success: false, error: result.error ?? "Publish failed" };

    revalidatePath("/");
    revalidatePath("/admin/dashboard");

    return { success: true, websiteId: website.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Creation failed" };
  }
}
