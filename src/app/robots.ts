import type { MetadataRoute } from "next";
import { getPlatformConfig } from "@/lib/config/platform";

export default function robots(): MetadataRoute.Robots {
  const appUrl = getPlatformConfig().appUrl;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/super-admin/", "/agency/", "/builder/", "/api/"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
