import type { WebsiteBlueprint } from "@/modules/website-blueprint/domain/types";

export interface BlueprintProvisioningData {
  runId?: string;
  creatorName: string;
  sourceUrl?: string;
  sourcePlatform?: string;
  generatedContent?: {
    heroTitle?: string;
    tagline?: string;
    aboutSection?: string;
    seoTitle?: string;
    seoDescription?: string;
  };
  generatedTheme?: {
    preset?: string;
    colors?: { primary?: string; secondary?: string };
  };
}

export class BlueprintProvisioningAdapter {
  /** Translates WebsiteBlueprint into legacy provisioning input format. */
  toProvisioningInput(blueprint: WebsiteBlueprint): BlueprintProvisioningData {
    const name = blueprint.branding.businessName || blueprint.metadata.name;

    return {
      creatorName: name,
      sourceUrl: blueprint.metadata.sourceInput,
      sourcePlatform: blueprint.metadata.sourceStrategy,
      generatedContent: {
        heroTitle: blueprint.branding.tagline || `Welcome to ${name}`,
        tagline: blueprint.branding.tagline,
        aboutSection: blueprint.branding.bio,
        seoTitle: blueprint.seo.globalTitle,
        seoDescription: blueprint.seo.globalDescription,
      },
      generatedTheme: {
        preset: "custom",
        colors: {
          primary: blueprint.branding.primaryColor,
          secondary: blueprint.branding.secondaryColor,
        },
      },
    };
  }
}

export const provisioningAdapter = new BlueprintProvisioningAdapter();
