"use client";

/**
 * ImportInputRenderer — IMPLEMENTATION-55.1
 *
 * Renders provider-specific input based entirely on ImportProvider metadata.
 * No provider-specific if/else blocks. Every form is driven from the registry.
 */
import { useState } from "react";
import type { ImportProvider } from "@/lib/import-provider/registry";
import { Loader2 } from "lucide-react";

export function ImportInputRenderer({
  provider,
  onSubmit,
  loading,
}: {
  provider: ImportProvider;
  onSubmit: (data: { sourceUrl: string; name?: string; meta?: Record<string, string> }) => void;
  loading: boolean;
}) {
  const [urlValue, setUrlValue] = useState("");
  const [textareaValue, setTextareaValue] = useState("");
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // ── URL providers (YouTube, Website, Google Business) ──
  if (provider.inputType === "url") {
    const handleUrlSubmit = () => {
      const err = provider.validateInput?.(urlValue);
      if (err) { setValidationError(err); return; }
      setValidationError(null);
      onSubmit({ sourceUrl: urlValue.trim() });
    };

    return (
      <div className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-white">{provider.title}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{provider.subtitle}</p>
        </div>
        <input
          type="url"
          value={urlValue}
          onChange={(e) => { setUrlValue(e.target.value); setValidationError(null); }}
          placeholder={provider.placeholder}
          className="admin-input text-sm py-2.5 w-full"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") handleUrlSubmit(); }}
        />
        {provider.helperText && <p className="text-[11px] text-[var(--text-muted)]">{provider.helperText}</p>}
        {validationError && <p className="text-xs text-red-400">{validationError}</p>}
        <button onClick={handleUrlSubmit} disabled={!urlValue.trim() || loading} className="btn-primary w-full py-3 disabled:opacity-50">
          {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Analysing…</span> : "Continue"}
        </button>
      </div>
    );
  }

  // ── Text / AI providers (Manual AI) ──
  if (provider.inputType === "text") {
    const handleTextSubmit = () => {
      const fields = provider.aiFormFields;
      const name = fields?.find((f) => f.key === "name");
      const aboutField = fields?.find((f) => f.type === "textarea" || f.key === "about");
      const requiredField = fields?.find((f) => f.required);
      if (requiredField && !formFields[requiredField.key]?.trim()) {
        setValidationError(`${requiredField.label} is required.`);
        return;
      }
      if (!textareaValue.trim()) {
        setValidationError("Tell us about your work so we can build your storefront.");
        return;
      }
      setValidationError(null);
      onSubmit({ sourceUrl: textareaValue.trim(), name: name ? formFields[name.key] : undefined, meta: formFields });
    };

    return (
      <div className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-white">{provider.title}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{provider.subtitle}</p>
        </div>
        {provider.aiFormFields && provider.aiFormFields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{field.label}</label>
            <input
              type="text"
              value={formFields[field.key] || ""}
              onChange={(e) => setFormFields({ ...formFields, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="admin-input text-sm py-2 w-full"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">About You</label>
          <textarea
            value={textareaValue}
            onChange={(e) => setTextareaValue(e.target.value)}
            placeholder={provider.placeholder}
            className="admin-input text-sm py-2.5 w-full min-h-[120px] resize-y"
            autoFocus
            rows={4}
          />
        </div>
        {provider.helperText && <p className="text-[11px] text-[var(--text-muted)]">{provider.helperText}</p>}
        {validationError && <p className="text-xs text-red-400">{validationError}</p>}
        <button onClick={handleTextSubmit} disabled={!textareaValue.trim() || loading} className="btn-primary w-full py-3 disabled:opacity-50">
          {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Building…</span> : "Build Storefront"}
        </button>
      </div>
    );
  }

  // ── No input (Blank) — this is handled in the parent by redirecting immediately ──
  return null;
}
