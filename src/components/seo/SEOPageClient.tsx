"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ContentContainer, PageSection, DashboardGrid, DashboardGridMain, DashboardGridSide } from "@/components/layout";
import { PageHeader } from "@/components/layout/PageHeader";
import { SEOScoreCard } from "./SEOScoreCard";
import { GlobalSEOSettingsForm } from "./GlobalSEOSettingsForm";
import { PageSEOSettingsForm } from "./PageSEOSettingsForm";
import { StructuredDataBuilder } from "./StructuredDataBuilder";
import { seoService, mapGlobalSettingsToForm, mapPageSettingsToForm } from "@/lib/seo";
import type { SEOGlobalSettings, PageSEOSettings } from "@/lib/seo";
import { PAGE_TYPES } from "@/lib/seo/constants";

interface SEOPageClientProps {
  storeName: string;
  storefrontUrl: string;
}

export function SEOPageClient({ storeName, storefrontUrl }: SEOPageClientProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedPage, setSelectedPage] = useState<string>("home");
  const [saved, setSaved] = useState(false);

  const globalDefaults: SEOGlobalSettings = useMemo(() => mapGlobalSettingsToForm({
    siteTitle: storeName,
    brandName: storeName,
    metaDescription: `Browse ${storeName}'s collection on CreatorStore`,
    canonicalDomain: storefrontUrl,
    robotsIndex: true,
    sitemapEnabled: true,
    language: "en",
    locale: "en_US",
  }), [storeName, storefrontUrl]);

  const pageDefaults = useMemo(() => {
    const pages: Record<string, PageSEOSettings> = {};
    for (const type of PAGE_TYPES) {
      pages[type] = mapPageSettingsToForm({
        id: type,
        pageType: type,
        seoTitle: `${storeName} — ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        slug: type === "home" ? "" : type,
        canonicalUrl: type === "home" ? storefrontUrl : `${storefrontUrl}/${type}`,
      });
    }
    return pages;
  }, [storeName, storefrontUrl]);

  const currentPageSettings = pageDefaults[selectedPage] ?? pageDefaults["home"];

  const score = useMemo(() => seoService.computeScore(currentPageSettings), [currentPageSettings]);

  const TABS = [
    { key: "dashboard" as const, label: "Dashboard" },
    { key: "global" as const, label: "Global Settings" },
    { key: "pages" as const, label: "Per-Page Settings" },
    { key: "structured" as const, label: "Structured Data" },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ContentContainer>
      <PageHeader
        title="SEO"
        description="Search engine optimization for your CreatorStore"
        breadcrumbs={[{ label: "Website", href: "/admin/appearance" }, { label: "SEO" }]}
        status={saved ? { label: "Saved!", variant: "success" } : { label: "Live", variant: "default" }}
      />
      <nav className="mb-6 flex gap-1 border-b border-white/10" aria-label="SEO tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.key
                ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "dashboard" && (
        <DashboardGrid>
          <DashboardGridMain>
            <PageSection>
              <GlobalSEOSettingsForm initial={globalDefaults} onSave={handleSave} />
            </PageSection>
          </DashboardGridMain>
          <DashboardGridSide>
            <SEOScoreCard score={score} />
            <PageSection>
              <div className="admin-card p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Quick Links</h3>
                <div className="space-y-2">
                  <a href="#global" onClick={(e) => { e.preventDefault(); setActiveTab("global"); }} className="block rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10">
                    Configure Global Settings
                  </a>
                  <a href="#pages" onClick={(e) => { e.preventDefault(); setActiveTab("pages"); }} className="block rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10">
                    Edit Page-Level SEO
                  </a>
                  <a href="#structured" onClick={(e) => { e.preventDefault(); setActiveTab("structured"); }} className="block rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10">
                    Generate Structured Data
                  </a>
                  <a href={storefrontUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg bg-white/5 px-3 py-2 text-sm text-[var(--brand-primary)] hover:bg-white/10">
                    View Storefront →
                  </a>
                </div>
              </div>
            </PageSection>
          </DashboardGridSide>
        </DashboardGrid>
      )}

      {activeTab === "global" && (
        <GlobalSEOSettingsForm initial={globalDefaults} onSave={handleSave} />
      )}

      {activeTab === "pages" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {PAGE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedPage(type)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedPage === type ? "bg-[var(--brand-primary)] text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          <PageSEOSettingsForm initial={currentPageSettings} global={globalDefaults} onSave={handleSave} />
        </div>
      )}

      {activeTab === "structured" && (
        <StructuredDataBuilder />
      )}
    </ContentContainer>
  );
}
