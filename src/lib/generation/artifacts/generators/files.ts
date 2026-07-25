import type { WebsiteBlueprint } from "@/lib/generation/composition/types";
import { BaseGenerator } from "./base-generator";

export class RobotsGenerator extends BaseGenerator<string> {
  readonly type = "robots_txt" as const;

  generateData(blueprint: WebsiteBlueprint): string {
    const domain = `https://${blueprint.website.domain}`;
    const lines: string[] = [];
    lines.push("User-agent: *");
    lines.push(`Sitemap: ${domain}/sitemap.xml`);
    lines.push("");
    lines.push("Disallow: /api/");
    lines.push("Disallow: /admin/");
    lines.push("Disallow: /_next/");
    lines.push("");

    const homeSlug = blueprint.pages.find((p) => p.type === "home")?.slug ?? "";
    const visiblePages = blueprint.pages.filter((p) => p.visible);
    for (const page of visiblePages) {
      const url = page.slug === homeSlug ? "/" : `/${page.slug.split("/").slice(1).join("/")}`;
      lines.push(`Allow: ${url}$`);
    }

    return lines.join("\n");
  }
}

export class SitemapGenerator extends BaseGenerator<string> {
  readonly type = "sitemap_xml" as const;

  generateData(blueprint: WebsiteBlueprint): string {
    const domain = `https://${blueprint.website.domain}`;
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

    const homeSlug = blueprint.pages.find((p) => p.type === "home")?.slug ?? "";
    const visiblePages = blueprint.pages.filter((p) => p.visible).sort((a, b) => a.order - b.order);

    for (const page of visiblePages) {
      const url = page.slug === homeSlug ? "" : `/${page.slug.split("/").slice(1).join("/")}`;
      lines.push("  <url>");
      lines.push(`    <loc>${domain}${url}</loc>`);
      lines.push(`    <priority>${page.order === 1 ? "1.0" : "0.8"}</priority>`);
      lines.push(`    <changefreq>${blueprint.seo.sitemapChangefreq}</changefreq>`);
      lines.push("  </url>");
    }

    lines.push("</urlset>");
    return lines.join("\n");
  }
}

export class ManifestGenerator extends BaseGenerator<Record<string, unknown>> {
  readonly type = "manifest_json" as const;

  generateData(blueprint: WebsiteBlueprint): Record<string, unknown> {
    return {
      name: blueprint.website.title,
      short_name: blueprint.website.title.slice(0, 12),
      description: blueprint.website.description,
      start_url: "/",
      display: "standalone",
      background_color: blueprint.theme.background,
      theme_color: blueprint.theme.primary,
      orientation: "portrait-primary",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      categories: ["general"],
    };
  }
}

export class MetadataGenerator extends BaseGenerator<Record<string, unknown>> {
  readonly type = "metadata" as const;

  generateData(blueprint: WebsiteBlueprint): Record<string, unknown> {
    return {
      generatedAt: blueprint.metadata.generatedAt,
      version: blueprint.metadata.version,
      confidence: blueprint.metadata.confidence,
      sourceKey: blueprint.metadata.sourceKey,
      intelligenceVersion: blueprint.metadata.intelligenceVersion,
      pageCount: blueprint.pages.length,
      sectionCount: blueprint.sections.length,
      productCount: blueprint.products.length,
      hasGallery: blueprint.gallery.enabled,
      hasFeed: blueprint.feed.enabled,
      themeMode: blueprint.theme.mode,
    };
  }
}
