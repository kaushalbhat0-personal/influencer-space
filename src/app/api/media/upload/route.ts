import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mediaService, MediaValidationError } from "@/lib/media/service";

export const runtime = "nodejs";
export const maxDuration = 120;

const ok = (payload: object) => NextResponse.json(payload, { status: 200 });
const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status });

/**
 * POST /api/media/upload — multipart upload endpoint.
 *
 * CONTRACT (IMPLEMENTATION-20): this route returns `application/json` for
 * EVERY response — success and failure — and never an HTML page, a redirect,
 * or a Server Action response. It is a plain Route Handler (no action id), so
 * uploads survive deployment changes and can never go stale. The client
 * (`client-upload.ts`) relies on this contract.
 *
 * Used by MediaField, MediaFieldMulti, ImageManager, MediaPickerDialog and the
 * Media Library so upload progress can be streamed via XHR.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;
    if (!tenantId) return fail("Unauthorized", 401);

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return fail("Invalid multipart body", 400);
    }

    const file = formData.get("file");
    if (!(file instanceof File)) return fail("No file provided", 400);

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

    return ok({
      success: true,
      assetId: result.assetId,
      url: result.url,
      deduplicated: result.deduplicated,
    });
  } catch (error) {
    if (error instanceof MediaValidationError) {
      return fail(error.message, 400);
    }
    const message = error instanceof Error ? error.message : "Upload failed";
    return fail(message, 400);
  }
}
