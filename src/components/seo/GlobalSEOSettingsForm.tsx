"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { MetadataCard } from "./MetadataCard";
import { metadataRegistry } from "@/lib/seo";
import type { SEOGlobalSettings } from "@/lib/seo";
import { Globe, Save, RotateCcw, Eye } from "lucide-react";

interface GlobalSEOSettingsFormProps {
  initial: SEOGlobalSettings;
  onSave: (settings: SEOGlobalSettings) => void;
}

export function GlobalSEOSettingsForm({ initial, onSave }: GlobalSEOSettingsFormProps) {
  const [settings, setSettings] = useState<SEOGlobalSettings>(initial);
  const [showPreview, setShowPreview] = useState(false);

  const preview = metadataRegistry.buildGlobalPreview(settings);

  const update = <K extends keyof SEOGlobalSettings>(key: K, value: SEOGlobalSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <DashboardWidget
        title="Global SEO Settings"
        icon={Globe}
        description="Default SEO settings for your entire storefront"
        actions={
          <Button size="sm" variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="h-3.5 w-3.5 mr-1" /> Preview
          </Button>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              label="Site Title"
              id="siteTitle"
              value={settings.siteTitle}
              onChange={(e) => update("siteTitle", e.target.value)}
              placeholder="Your store name"
            />
            <Input
              label="Brand Name"
              id="brandName"
              value={settings.brandName}
              onChange={(e) => update("brandName", e.target.value)}
              placeholder="Brand name"
            />
            <Textarea
              label="Default Meta Description"
              id="metaDescription"
              value={settings.metaDescription}
              onChange={(e) => update("metaDescription", e.target.value)}
              placeholder="Describe your store"
              rows={3}
            />
            <Input
              label="Default Keywords (comma-separated)"
              id="defaultKeywords"
              value={settings.defaultKeywords}
              onChange={(e) => update("defaultKeywords", e.target.value)}
              placeholder="fashion, lifestyle, blog"
            />
            <Input
              label="Canonical Domain"
              id="canonicalDomain"
              value={settings.canonicalDomain}
              onChange={(e) => update("canonicalDomain", e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="space-y-4">
            <Input
              label="Default OG Image URL"
              id="defaultOGImage"
              value={settings.defaultOGImage}
              onChange={(e) => update("defaultOGImage", e.target.value)}
              placeholder="https://example.com/og-default.jpg"
            />
            <Input
              label="Default Twitter Image URL"
              id="defaultTwitterImage"
              value={settings.defaultTwitterImage}
              onChange={(e) => update("defaultTwitterImage", e.target.value)}
              placeholder="https://example.com/twitter-default.jpg"
            />
            <Input
              label="Favicon URL"
              id="favicon"
              value={settings.favicon}
              onChange={(e) => update("favicon", e.target.value)}
              placeholder="https://example.com/favicon.ico"
            />
            <Input
              label="Theme Color"
              id="themeColor"
              value={settings.themeColor}
              onChange={(e) => update("themeColor", e.target.value)}
              placeholder="#000000"
              type="color"
              className="h-10 w-full"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Language"
                id="language"
                value={settings.language}
                onChange={(e) => update("language", e.target.value)}
                placeholder="en"
              />
              <Input
                label="Locale"
                id="locale"
                value={settings.locale}
                onChange={(e) => update("locale", e.target.value)}
                placeholder="en_US"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={settings.robotsIndex}
              onChange={(e) => update("robotsIndex", e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 text-s8ul-cyan focus:ring-s8ul-cyan"
            />
            Allow search engines to index the site
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={settings.sitemapEnabled}
              onChange={(e) => update("sitemapEnabled", e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 text-s8ul-cyan focus:ring-s8ul-cyan"
            />
            Enable sitemap generation
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSettings(initial)}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={() => onSave(settings)}>
            <Save className="h-3.5 w-3.5 mr-1" /> Save Settings
          </Button>
        </div>
      </DashboardWidget>

      {showPreview && (
        <MetadataCard preview={preview} />
      )}
    </div>
  );
}
