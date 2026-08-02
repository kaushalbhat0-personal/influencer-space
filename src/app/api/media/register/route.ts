import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mediaService } from "@/lib/media/service";

export const runtime = "nodejs";
export const maxDuration = 120;

const ok = (payload: object) => NextResponse.json(payload, { status: 200 });
const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

/**
 * POST /api/media/register — step 2 of the direct-to-storage upload.
 *
 * Registers the Asset row + reference for a file the client already uploaded
 * directly to storage (via the signed URL from /api/media/upload-url).
 *
 * Response contract (always application/json):
 *   { success:true, assetId, url, deduplicated:false }
 *   { success:false, error }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;
    if (!tenantId) return fail("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return fail("Invalid JSON body", 400);
    }

    const storageKey = typeof body.storageKey === "string" ? body.storageKey : "";
    const publicUrl = typeof body.publicUrl === "string" ? body.publicUrl : "";
    const filename = typeof body.filename === "string" ? body.filename : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
    const size = Number(body.size ?? 0);
    const checksum = typeof body.checksum === "string" ? body.checksum : "";

    if (!storageKey || !publicUrl || !filename || !mimeType || size <= 0) {
      return fail("Missing storageKey/publicUrl/filename/mimeType/size", 400);
    }

    const result = await mediaService.completeSignedUpload({
      tenantId,
      storageKey,
      publicUrl,
      filename: storageKey.split("/").pop() ?? filename,
      originalFilename: filename,
      mimeType,
      size,
      checksum,
      folder: typeof body.folder === "string" ? body.folder : undefined,
      entityType: typeof body.entityType === "string" ? body.entityType : undefined,
      entityId: typeof body.entityId === "string" ? body.entityId : undefined,
      entityField: typeof body.entityField === "string" ? body.entityField : undefined,
      width: typeof body.width === "number" ? body.width : undefined,
      height: typeof body.height === "number" ? body.height : undefined,
      duration: typeof body.duration === "number" ? body.duration : undefined,
      altText: typeof body.altText === "string" ? body.altText : undefined,
    });

    return ok({ success: true, assetId: result.assetId, url: result.url, deduplicated: false });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to register upload", 400);
  }
}
