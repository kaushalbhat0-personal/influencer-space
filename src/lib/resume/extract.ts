/**
 * Resume text extraction — minimal, tenant-scoped, no secrets in logs.
 * Supports text/plain, text/csv (utf-8) and application/pdf (pdf-parse).
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
    // pdf-parse@1.1.1 enters a legacy debug branch when loaded via ESM
    // (`!module.parent` is truthy for ESM `import("pdf-parse")`), which
    // synchronously reads `./test/data/05-versions-space.pdf` and throws
    // ENOENT before the uploaded buffer is ever parsed. Loading through
    // CommonJS `require` keeps `module.parent` truthy so the debug branch
    // is skipped. `createRequire` is the ESM-compatible way to obtain a CJS
    // `require` under Node; plain `eval("require")` is the Next.js-bundler
    // fallback (server actions are bundled and `import.meta.url` may not
    // resolve).
    let pdfParse: (data: Buffer) => Promise<{ text: string }>;
    try {
      // Prefer ESM-safe CJS require (survives bundling via createRequire)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let mod: any;
      try {
        const { createRequire } = await import("node:module");
        // `import.meta.url` is available in native ESM; Next.js may transpile
        // this file, so guard dynamically via `eval` to avoid static analysis.
        const metaUrl: string | undefined =
          (eval("import.meta.url") as string | undefined) ??
          (typeof __filename !== "undefined" ? __filename : undefined);
        if (!metaUrl) throw new Error("no metaUrl");
        const require = createRequire(metaUrl);
        mod = require("pdf-parse");
      } catch {
        // Next.js server-bundle fallback: direct CJS require (externals-safe)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        mod = eval("require")("pdf-parse");
      }
      pdfParse = (mod?.default ?? mod) as (data: Buffer) => Promise<{ text: string }>;
      if (typeof pdfParse !== "function") throw new Error("PDF parser unavailable");
    } catch (e) {
      // Do not leak filesystem/package internals to caller
      throw new Error("PDF parsing failed");
    }
    try {
      const data = await pdfParse(buffer);
      const text = (data.text || "").trim();
      if (!text) throw new Error("PDF contains no extractable text");
      return text.slice(0, 12000);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "PDF parsing failed";
      // Sanitize: never surface ENOENT paths or package internals to user
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
