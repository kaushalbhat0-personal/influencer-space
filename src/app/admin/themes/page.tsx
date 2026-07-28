import { themeRegistry } from "@/lib/theme/registry-new";
import { ThemeGalleryClient } from "./theme-gallery-client";
import type { PlanTier } from "@/lib/platform/capabilities/subscriptions";

export const dynamic = "force-dynamic";

export default async function ThemesPage() {
  const themes = themeRegistry.getAll();
  const categories = themeRegistry.getCategories();

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Theme Gallery</h1>
        <p className="mt-1 text-sm text-gray-400">Choose a theme for your website. Themes control colors, typography, and visual style.</p>
      </div>
      <ThemeGalleryClient themes={themes} categories={categories} />
    </div>
  );
}
