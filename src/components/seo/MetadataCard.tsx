"use client";

import { DashboardWidget } from "@/components/ui/DashboardWidget";
import type { MetadataPreview } from "@/lib/seo";
import { FileText } from "lucide-react";
import { getPreviewRenderers } from "./preview-providers";

interface MetadataCardProps {
  preview: MetadataPreview;
  loading?: boolean;
  error?: string;
  showAll?: boolean;
}

export function MetadataCard({ preview, loading, error, showAll = true }: MetadataCardProps) {
  const renderers = showAll ? getPreviewRenderers() : getPreviewRenderers().slice(0, 2);

  return (
    <DashboardWidget title="Metadata Preview" icon={FileText} loading={loading} error={error}>
      <div className="space-y-4">
        {renderers.map((renderer) => (
          <div key={renderer.type}>
            <p className="text-[10px] uppercase text-zinc-500 tracking-wider mb-1.5">
              {renderer.label}
            </p>
            {renderer.render(preview)}
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
}
