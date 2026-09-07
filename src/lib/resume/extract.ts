/**
 * Resume text extraction — minimal, tenant-scoped, no secrets in logs.
 * Supports text/plain, text/csv (utf-8) and application/pdf (unpdf).
 * DOCX deliberately deferred (P2) per audit.
 */
export async function extractResumeText(buffer: Buffer, mimeType: string): Promise<string> {
  if (!buffer || buffer.length === 0) throw new Error("Resume file is empty");

  if (mimeType === "text/plain" || mimeType === "text/csv") {
    const text = buffer.toString("utf-8");
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Resume text is empty");
    // Cap at ~12k chars — enough for knowledgeGraph bio without blowing token limits
    return trimmed.slice(0, 12000);
  }

  if (mimeType === "application/pdf") {
    try {
      const { extractText } = await import("unpdf");
      const data = new Uint8Array(buffer);
      const result = await extractText(data, { mergePages: true });
      const text = (typeof result.text === "string" ? result.text : String(result.text ?? "")).trim();
      if (!text) throw new Error("PDF contains no extractable text");
      return text.slice(0, 12000);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "PDF parsing failed";
      const isInternal =
        raw.includes("ENOENT") || raw.includes("test/data") || raw.includes("module.parent");
      const msg = isInternal ? "PDF parsing failed" : raw;
      throw new Error(msg.slice(0, 300));
    }
  }

  throw new Error(`Unsupported resume MIME type: ${mimeType}`);
}

/**
 * Very light name inference from resume text — first non-empty line that looks like a name.
 * Falls back to filename.
 */
export function inferResumeName(text: string, fallbackFilename: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const first = lines[0];
    // Heuristic: 2-4 words, each capitalized, no @ or http
    if (first.length < 60 && !first.includes("@") && !first.includes("http") && first.split(/\s+/).length <= 4) {
      return first;
    }
  }
  const base = fallbackFilename.replace(/\.[^.]+$/, "");
  return base || "Creator";
}
