"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { seoService, metadataRegistry, scoreEngine } from "@/lib/seo";
import type { PageSEOSettings, SEOGlobalSettings } from "@/lib/seo";
import { SEO_TITLE_MAX, SEO_DESCRIPTION_MAX } from "@/lib/seo/constants";
import { Settings, Eye, RotateCcw, Save } from "lucide-react";
import { ValidationList } from "./ValidationList";
import { MetadataCard } from "./MetadataCard";

interface PageSEOSettingsFormProps {
  initial: PageSEOSettings;
  global: SEOGlobalSettings;
  onSave: (settings: PageSEOSettings) => void;
}

export function PageSEOSettingsForm({ initial, global, onSave }: PageSEOSettingsFormProps) {
  const [settings, setSettings] = useState<PageSEOSettings>(initial);
  const [showPreview, setShowPreview] = useState(false);

  const validationResults = useMemo(() => seoService.validatePage(settings), [settings]);
  const score = useMemo(() => seoService.computeScore(settings), [settings]);
  const preview = useMemo(() => metadataRegistry.buildPreview(settings.pageType, settings, global), [settings, global]);

  const update = <K extends keyof PageSEOSettings>(key: K, value: PageSEOSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const scoreLabel = scoreEngine.getScoreLabel(score.overall);

  return (
    <div className="space-y-6">
      <DashboardWidget
        title="Page SEO Settings"
        icon={Settings}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={scoreLabel.color === "emerald" ? "success" : scoreLabel.color === "amber" ? "warning" : "danger"}>
              Score: {score.overall}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Preview
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              label={`SEO Title (${settings.seoTitle.length}/${SEO_TITLE_MAX})`}
              id="seoTitle"
              value={settings.seoTitle}
              onChange={(e) => update("seoTitle", e.target.value)}
              placeholder="Enter SEO title"
              error={validationResults.find((r) => r.field === "seoTitle" && !r.passed)?.message}
            />
            <Textarea
              label={`Meta Description (${settings.metaDescription.length}/${SEO_DESCRIPTION_MAX})`}
              id="metaDescription"
              value={settings.metaDescription}
              onChange={(e) => update("metaDescription", e.target.value)}
              placeholder="Enter meta description"
              rows={3}
              error={validationResults.find((r) => r.field === "metaDescription" && !r.passed)?.message}
            />
            <Input
              label="Slug"
              id="slug"
              value={settings.slug}
              onChange={(e) => update("slug", e.target.value)}
              placeholder="page-slug"
              error={validationResults.find((r) => r.field === "slug" && !r.passed)?.message}
            />
            <Input
              label="Canonical URL"
              id="canonicalUrl"
              value={settings.canonicalUrl}
              onChange={(e) => update("canonicalUrl", e.target.value)}
              placeholder="https://example.com/page"
              error={validationResults.find((r) => r.field === "canonicalUrl" && !r.passed)?.message}
            />
          </div>
          <div className="space-y-4">
            <Input
              label="OG Title"
              id="ogTitle"
              value={settings.ogTitle}
              onChange={(e) => update("ogTitle", e.target.value)}
              placeholder="Open Graph title"
            />
            <Textarea
              label="OG Description"
              id="ogDescription"
              value={settings.ogDescription}
              onChange={(e) => update("ogDescription", e.target.value)}
              placeholder="Open Graph description"
              rows={2}
            />
            <Input
              label="OG Image URL"
              id="ogImage"
              value={settings.ogImage}
              onChange={(e) => update("ogImage", e.target.value)}
              placeholder="https://example.com/og-image.jpg"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              label="Twitter Title"
              id="twitterTitle"
              value={settings.twitterTitle}
              onChange={(e) => update("twitterTitle", e.target.value)}
              placeholder="Twitter card title"
            />
            <Textarea
              label="Twitter Description"
              id="twitterDescription"
              value={settings.twitterDescription}
              onChange={(e) => update("twitterDescription", e.target.value)}
              placeholder="Twitter card description"
              rows={2}
            />
            <Input
              label="Twitter Image URL"
              id="twitterImage"
              value={settings.twitterImage}
              onChange={(e) => update("twitterImage", e.target.value)}
              placeholder="https://example.com/twitter-image.jpg"
            />
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={settings.robotsNoIndex}
                onChange={(e) => update("robotsNoIndex", e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-800 text-s8ul-cyan focus:ring-s8ul-cyan"
              />
              No Index (hide from search engines)
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={settings.robotsNoFollow}
                onChange={(e) => update("robotsNoFollow", e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-800 text-s8ul-cyan focus:ring-s8ul-cyan"
              />
              No Follow (don&apos;t follow links on this page)
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSettings(initial)}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={() => onSave(settings)}>
            <Save className="h-3.5 w-3.5 mr-1" /> Save Changes
          </Button>
        </div>
      </DashboardWidget>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardWidget title="Validation" icon={Settings}>
          <ValidationList results={validationResults} />
        </DashboardWidget>
        {showPreview && (
          <MetadataCard preview={preview} />
        )}
      </div>
    </div>
  );
}
