import type { WebsiteBlueprint } from "@/lib/generation/composition/types";
import type { Artifact } from "@/lib/generation/artifacts/types";
import type { BuilderInitResult, PublishSnapshotResult, StorefrontRenderResult, WebsiteRecord } from "./types";

export class WebsiteAdapter {
  adapt(blueprint: WebsiteBlueprint): WebsiteRecord {
    return {
      id: `website_${blueprint.metadata.sourceKey}`,
      title: blueprint.website.title,
      domain: blueprint.website.domain,
      locale: blueprint.website.locale,
      currency: blueprint.website.currency,
      theme: {
        mode: blueprint.theme.mode,
        primary: blueprint.theme.primary,
        secondary: blueprint.theme.secondary,
        accent: blueprint.theme.accent,
        background: blueprint.theme.background,
        text: blueprint.theme.text,
        fonts: blueprint.theme.fonts,
        spacing: blueprint.theme.spacing,
        borderRadius: blueprint.theme.borderRadius,
        buttons: blueprint.theme.buttons,
        cards: blueprint.theme.cards,
        colors: blueprint.theme.colors,
      },
      seo: {
        title: blueprint.seo.title,
        description: blueprint.seo.description,
        keywords: blueprint.seo.keywords,
        ogImage: blueprint.seo.ogImage,
        canonical: blueprint.seo.canonical,
      },
      navigation: {
        desktop: blueprint.navigation.desktop,
        mobileBottom: blueprint.navigation.mobileBottom,
        sticky: blueprint.navigation.sticky,
      },
      status: "active",
      version: blueprint.metadata.version,
    };
  }
}

export class BuilderAdapter {
  adapt(artifacts: Artifact[]): BuilderInitResult {
    const builderArtifact = artifacts.find((a) => a.manifest.type === "builder_json");
    const data = builderArtifact?.data as Record<string, unknown> | undefined;

    return {
      websiteId: "",
      blocks: (data?.blocks as unknown[])?.length ?? 0,
      layout: (data?.layout as string) ?? "single",
      version: builderArtifact?.manifest.version ?? 1,
      createdAt: builderArtifact?.manifest.createdAt ?? new Date().toISOString(),
    };
  }
}

export class PublishAdapter {
  adapt(artifacts: Artifact[]): PublishSnapshotResult {
    const snapshot = artifacts.find((a) => a.manifest.type === "publish_snapshot");

    return {
      snapshotId: snapshot?.manifest.id ?? `snapshot_${Date.now()}`,
      version: snapshot?.manifest.version ?? 1,
      artifactCount: artifacts.length,
      checksum: snapshot?.manifest.checksum ?? "",
      createdAt: snapshot?.manifest.createdAt ?? new Date().toISOString(),
    };
  }
}

export class StorefrontAdapter {
  adapt(artifacts: Artifact[], metadata?: Record<string, unknown>): StorefrontRenderResult {
    const storefrontArtifact = artifacts.find((a) => a.manifest.type === "storefront_json");
    const data = storefrontArtifact?.data as Record<string, unknown> | undefined;

    return {
      website: (data?.website as Record<string, unknown>) ?? {},
      navigation: (data?.navigation as Record<string, unknown>) ?? {},
      sections: (data?.sections as Array<Record<string, unknown>>) ?? [],
      theme: (data?.theme as Record<string, unknown>) ?? {},
      seo: (data?.seo as Record<string, unknown>) ?? {},
      products: (data?.products as Array<Record<string, unknown>>) ?? [],
      gallery: (data?.gallery as Record<string, unknown>) ?? {},
      feed: (data?.feed as Record<string, unknown>) ?? {},
      metadata: {
        ...(data?.metadata as Record<string, unknown> ?? {}),
        ...(metadata ?? {}),
      },
      renderedAt: new Date().toISOString(),
    };
  }
}
