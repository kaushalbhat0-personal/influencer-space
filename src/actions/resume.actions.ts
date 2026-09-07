"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mediaValidator } from "@/lib/media/validator";
import { extractResumeText, inferResumeName } from "@/lib/resume/extract";
import { logger } from "@/lib/observability/logger";

/**
 * Import resume — authoritative server action for resume upload.
 * Tenant-scoped (or user-scoped during onboarding when no tenant yet),
 * validates MIME/size server-side, never trusts client filename/type,
 * extracts text via existing pdf-parse/text path, never logs raw content.
 * Does NOT create a public Asset for onboarding; private storage is deferred
 * to post-provisioning if needed. For MVP, we extract in-memory and return
 * a CreatorProfile-compatible payload that feeds the existing pipeline.
 */
export async function importResume(formData: FormData): Promise<{
  success: boolean;
  creatorName?: string;
  bio?: string;
  rawSource?: string;
  platform?: string;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const file = formData.get("file");
    if (!(file instanceof File)) return { success: false, error: "No file provided" };

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name || "resume.pdf";
    const mimeType = file.type || "application/octet-stream";
    const size = buffer.length;

    // Server-side validation — never trust client-provided filename/type
    const folder = "resumes";
    const fileInfo = { filename, mimeType, size, buffer };
    const validation = mediaValidator.validateUpload(fileInfo, folder);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join("; ") };
    }

    // Additional resume-specific magic already covered by validator (PDF %PDF), but double-check
    const magicErr = mediaValidator.validateMagicBytes(mimeType, buffer);
    if (magicErr) return { success: false, error: magicErr };

    // Extract text via reusable helper (text/csv utf-8, pdf via pdf-parse)
    let extracted: string;
    try {
      extracted = await extractResumeText(buffer, mimeType);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to extract resume";
      logger.warn("Resume extraction failed", "resume", { metadata: { mimeType, size } });
      return { success: false, error: msg.slice(0, 300) };
    }

    if (!extracted || extracted.trim().length < 50) {
      return { success: false, error: "Resume text is too short or empty — please upload a complete PDF or TXT." };
    }

    const creatorName = inferResumeName(extracted, filename);
    const bio = extracted.trim();

    // Private: do not create public Asset with publicUrl for onboarding.
    // If tenant already exists, we could optionally persist as private Asset, but for MVP we keep in-memory
    // and let the existing pipeline consume bio directly (like manual_ai).
    // Audit log without content
    logger.info("Resume imported", "resume", { metadata: { userId: session.user.id, mimeType, size, nameLength: creatorName.length } });

    return {
      success: true,
      creatorName,
      bio,
      rawSource: `resume:${filename}`,
      platform: "resume",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to import resume";
    // Never log buffer or extracted text
    logger.warn("importResume failed", "resume", { metadata: { error: msg.slice(0, 200) } });
    return { success: false, error: msg.slice(0, 300) };
  }
}
