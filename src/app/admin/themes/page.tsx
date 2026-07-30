import { themeRegistry } from "@/lib/theme/registry-new";
import { ThemeMarketplaceClient } from "./_components/theme-marketplace-client";

export const dynamic = "force-dynamic";

export default async function ThemesPage() {
  const themes = themeRegistry.getAll();
  const categories = themeRegistry.getCategories();

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Theme Marketplace</h1>
        <p className="mt-1 text-sm text-gray-400">Browse, preview, and choose from 30+ professional themes. Each theme includes full color system, typography, and visual identity.</p>
      </div>
      <ThemeMarketplaceClient themes={themes} categories={categories} />
    </div>
  );
}
