import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://creatorshop.io";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/super-admin/", "/agency/", "/builder/", "/api/"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
