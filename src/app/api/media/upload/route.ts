import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mediaService } from "@/lib/media/service";

export const runtime = "nodejs";
export const maxDuration = 120;

async function requireTenant(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  return session.user.tenantId;
}

/**
 * POST /api/media/upload
 * Multipart upload endpoint. Used by the MediaField / Media Library clients so
 * upload progress can be streamed via XHR (fetch/server-actions cannot expose
 * upload progress). Mirrors uploadAsset() server action semantics.
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenant();
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });

    const folder = (formData.get("folder") as string) || "general";
    const entityType = (formData.get("entityType") as string) || undefined;
    const entityId = (formData.get("entityId") as string) || undefined;
    const entityField = (formData.get("entityField") as string) || undefined;
    const altText = (formData.get("altText") as string) || undefined;

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await mediaService.upload({
      tenantId,
      file: { filename: file.name, mimeType: file.type, size: file.size, buffer },
      folder,
      entityType,
      entityId,
      entityField,
      altText,
    });

    return NextResponse.json({
      success: true,
      assetId: result.assetId,
      url: result.url,
      deduplicated: result.deduplicated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
