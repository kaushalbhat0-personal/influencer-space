import type { StorefrontData } from "./types";

export function buildNavigationFromData(data: StorefrontData): Array<{ id: string; label: string; href: string }> {
  const nav: Array<{ id: string; label: string; href: string }> = [];
  for (const page of data.pages) {
    nav.push({ id: page.id, label: page.slug === "home" ? "Home" : page.slug, href: page.slug === "home" ? "/" : `/${page.slug}` });
  }
  return nav;
}

export function extractThemeStyle(data: StorefrontData): Record<string, string> {
  return {
    "--brand-primary": data.theme.primary,
    "--brand-secondary": data.theme.secondary,
    "--brand-accent": data.theme.accent,
    "--surface-root": data.theme.mode === "dark" ? "#09090b" : "#FFFFFF",
    "--surface-base": data.theme.mode === "dark" ? "#18181b" : "#F8FAFC",
    "--text-primary": data.theme.mode === "dark" ? "#fafafa" : "#0F172A",
    "--text-secondary": data.theme.mode === "dark" ? "#a1a1aa" : "#64748B",
  };
}

export function getActivePage(data: StorefrontData, slug: string): typeof data.pages[0] | undefined {
  if (slug === "home" || slug === "") return data.pages.find((p) => p.isHome) ?? data.pages[0];
  return data.pages.find((p) => p.slug === slug);
}
