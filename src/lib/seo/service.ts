import { validationEngine } from "./validation";
import { structuredDataRegistry } from "./structured-data";
import { metadataRegistry } from "./metadata";
import { scoreEngine } from "./score-engine";
import type { SEOGlobalSettings, PageSEOSettings, SEOScore, SEOValidationResult } from "./types";
import { mapGlobalSettingsToForm, mapPageSettingsToForm } from "./mapper";

export interface SEOService {
  validatePage(pageSettings: PageSEOSettings): SEOValidationResult[];
  computeScore(pageSettings: PageSEOSettings): SEOScore;
  generateStructuredData(type: string, params: Record<string, unknown>): ReturnType<typeof structuredDataRegistry.build>;
  buildPreview(pageSettings: PageSEOSettings, globalSettings: SEOGlobalSettings): ReturnType<typeof metadataRegistry.buildPreview>;
  getGlobalDefaults(): SEOGlobalSettings;
  getPageDefaults(pageType: string): PageSEOSettings;
}

function settingsToRecord(settings: PageSEOSettings): Record<string, string> {
  return {
    seoTitle: settings.seoTitle,
    metaDescription: settings.metaDescription,
    slug: settings.slug,
    canonicalUrl: settings.canonicalUrl,
    ogTitle: settings.ogTitle,
    ogDescription: settings.ogDescription,
    ogImage: settings.ogImage,
    twitterTitle: settings.twitterTitle,
    twitterDescription: settings.twitterDescription,
    twitterImage: settings.twitterImage,
    robotsNoIndex: String(settings.robotsNoIndex),
  };
}

export const seoService: SEOService = {
  validatePage(pageSettings: PageSEOSettings): SEOValidationResult[] {
    const record = settingsToRecord(pageSettings);
    const context: Record<string, unknown> = {
      ogDescription: pageSettings.ogDescription,
      ogImage: pageSettings.ogImage,
      twitterDescription: pageSettings.twitterDescription,
      twitterImage: pageSettings.twitterImage,
    };
    return validationEngine.validatePage(record, context);
  },

  computeScore(pageSettings: PageSEOSettings): SEOScore {
    const results = this.validatePage(pageSettings);
    const checks = results.map((r) => scoreEngine.validationToCheck(r));

    const hasStructuredData = results.some((r) => r.rule === "title_length" && r.passed);
    if (hasStructuredData) {
      checks.push({
        id: "structured_data",
        label: "Structured Data",
        passed: true,
        score: 100,
        severity: "info",
        recommendation: "",
      });
    }

    return scoreEngine.computeScore(checks);
  },

  generateStructuredData(type: string, params: Record<string, unknown>) {
    return structuredDataRegistry.build(type, params);
  },

  buildPreview(pageSettings: PageSEOSettings, globalSettings: SEOGlobalSettings) {
    return metadataRegistry.buildPreview(pageSettings.pageType, pageSettings, globalSettings);
  },

  getGlobalDefaults(): SEOGlobalSettings {
    return mapGlobalSettingsToForm({});
  },

  getPageDefaults(pageType: string): PageSEOSettings {
    return mapPageSettingsToForm({ pageType: pageType as PageSEOSettings["pageType"] });
  },
};
