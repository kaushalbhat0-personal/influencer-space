"use client";

import { useState } from "react";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { structuredDataRegistry } from "@/lib/seo";
import type { StructuredData } from "@/lib/seo";
import { STRUCTURED_DATA_TYPES } from "@/lib/seo/constants";
import { Shield, Copy, Check } from "lucide-react";

export function StructuredDataBuilder() {
  const [type, setType] = useState<string>("Organization");
  const [result, setResult] = useState<StructuredData | null>(null);
  const [copied, setCopied] = useState(false);

  const params: Record<string, Record<string, unknown>> = {
    Organization: { name: "My Brand", url: "https://example.com", logo: "https://example.com/logo.png", email: "hello@example.com", sameAs: ["https://instagram.com/brand"] },
    Website: { name: "My Brand", url: "https://example.com", description: "Best products online" },
    Product: { name: "Product Name", description: "Product description", image: "https://example.com/product.jpg", url: "https://example.com/product", price: 99, currency: "INR", inStock: true },
    ImageGallery: { name: "Gallery", description: "Photo collection", url: "https://example.com/gallery", images: [{ url: "https://example.com/photo1.jpg", caption: "Photo 1" }, { url: "https://example.com/photo2.jpg", caption: "Photo 2" }] },
    Breadcrumb: { items: [{ name: "Home", url: "https://example.com" }, { name: "Products", url: "https://example.com/products" }, { name: "Product Name", url: "https://example.com/product" }] },
    FAQ: { questions: [{ question: "What is this?", answer: "This is a product." }, { question: "How much?", answer: "$99" }] },
    Person: { name: "John Doe", url: "https://example.com/about", image: "https://example.com/avatar.jpg", description: "Creator and entrepreneur", sameAs: ["https://instagram.com/johndoe"] },
  };

  const handleBuild = () => {
    const data = structuredDataRegistry.build(type, params[type] ?? {});
    setResult(data);
    setCopied(false);
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result.jsonLd, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardWidget title="Structured Data Builder" icon={Shield} description="Generate JSON-LD for search engines">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Schema Type</label>
          <div className="flex flex-wrap gap-2">
            {STRUCTURED_DATA_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  type === t ? "bg-[var(--brand-primary)] text-white" : "bg-white/5 text-[var(--text-secondary)] hover:bg-white/10"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <Button size="sm" onClick={handleBuild}>Generate JSON-LD</Button>

        {result && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={result.valid ? "success" : "danger"}>{result.valid ? "Valid" : "Invalid"}</Badge>
                <span className="text-xs text-[var(--text-muted)]">{result.type}</span>
              </div>
              {result.valid && (
                <Button size="sm" variant="ghost" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="mb-2 space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-400">{err}</p>
                ))}
              </div>
            )}
            <pre className="rounded-lg bg-zinc-900 p-4 text-xs text-[var(--text-primary)] overflow-x-auto max-h-64 overflow-y-auto">
              {JSON.stringify(result.jsonLd, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
}
