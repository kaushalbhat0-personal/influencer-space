import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mediaService, MediaValidationError } from "@/lib/media/service";

export const runtime = "nodejs";
export const maxDuration = 120;

const ok = (payload: object) => NextResponse.json(payload, { status: 200 });
const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

/**
 * POST /api/media/upload-url — step 1 of the direct-to-storage upload.
 *
 * Validates file metadata, dedupes by checksum, and returns a SIGNED upload
 * URL so the file body goes straight to the storage provider — bypassing the
 * app server's request-body limit (Vercel returns HTTP 413 for large bodies).
 *
 * Response contract (always application/json):
 *   { success:true, deduplicated:true, assetId, url }
 *   { success:true, deduplicated:false, signed:{ uploadUrl, storageKey, publicUrl } | null, storageKey }
 *   { success:false, error }
 *
 * When `signed` is null the provider does not support direct uploads; the
 * client falls back to the multipart /api/media/upload route.
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

    const filename = typeof body.filename === "string" ? body.filename : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
    const size = Number(body.size ?? 0);
    const checksum = typeof body.checksum === "string" ? body.checksum : "";
    if (!filename || !mimeType || size <= 0 || !checksum) {
      return fail("Missing filename/mimeType/size/checksum", 400);
    }

    const result = await mediaService.prepareSignedUpload({
      tenantId,
      filename,
      mimeType,
      size,
      checksum,
      folder: typeof body.folder === "string" ? body.folder : undefined,
      entityType: typeof body.entityType === "string" ? body.entityType : undefined,
      entityId: typeof body.entityId === "string" ? body.entityId : undefined,
      entityField: typeof body.entityField === "string" ? body.entityField : undefined,
    });

    if ("deduplicated" in result && result.deduplicated) {
      return ok({ success: true, deduplicated: true, assetId: result.assetId, url: result.url });
    }
    return ok({ success: true, deduplicated: false, signed: result.signed, storageKey: result.storageKey });
  } catch (error) {
    if (error instanceof MediaValidationError) return fail(error.message, 400);
    return fail(error instanceof Error ? error.message : "Failed to prepare upload", 400);
  }
}
