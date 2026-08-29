import { SettingsService } from "@/services/settings.service";
import type { FooterContent, FooterColumn } from "@/types/snapshot";

const FOOTER_KEY = "footer_config" as const;

export interface FooterConfigInput {
  description?: string | null;
  copyright?: string | null;
  columns?: FooterColumn[];
}

const DEFAULT_FOOTER_COLUMNS: FooterColumn[] = [
  { title: "Products", links: [{ label: "Templates", href: "#products" }, { label: "Design Assets", href: "#products" }, { label: "Brand Kits", href: "#products" }, { label: "All Products", href: "#products" }] },
  { title: "Services", links: [{ label: "Brand Strategy", href: "#services" }, { label: "Web Design", href: "#services" }, { label: "Product Design", href: "#services" }, { label: "Creative Direction", href: "#services" }] },
  { title: "Company", links: [{ label: "About", href: "#timeline" }, { label: "Gallery / Work", href: "#gallery" }, { label: "Testimonials", href: "#testimonials" }, { label: "Contact", href: "#contact" }] },
  { title: "Support", links: [{ label: "FAQ", href: "#faq" }, { label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }, { label: "Refunds", href: "/refund" }] },
];

function normalizeColumns(input?: unknown): FooterColumn[] {
  if (!Array.isArray(input) || input.length === 0) return DEFAULT_FOOTER_COLUMNS;
  const cols = (input as FooterColumn[]).filter((c) => c.title && Array.isArray(c.links)).map((c) => ({
    title: String(c.title).trim(),
    links: c.links.filter((l) => l.label && l.href).map((l) => ({ label: String(l.label).trim(), href: String(l.href).trim() })),
  })).filter((c) => c.links.length > 0);
  return cols.length > 0 ? cols : DEFAULT_FOOTER_COLUMNS;
}

export const footerService = {
  FOOTER_KEY_NAME: FOOTER_KEY,
  defaultColumns: DEFAULT_FOOTER_COLUMNS,

  async get(tenantId: string): Promise<FooterContent | null> {
    const v = await SettingsService.getSettingByKey(tenantId, FOOTER_KEY);
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    return {
      description: typeof o.description === "string" ? o.description : null,
      copyright: typeof o.copyright === "string" ? o.copyright : null,
      columns: normalizeColumns(o.columns),
    };
  },

  async getOrDefaults(tenantId: string, fallbackIdentity?: { name?: string; bio?: string; tagline?: string }): Promise<FooterContent> {
    const existing = await footerService.get(tenantId);
    if (existing) return existing;
    const brand = fallbackIdentity?.name || "Northstar Studio";
    const desc = fallbackIdentity?.bio || fallbackIdentity?.tagline || "Design that moves your business forward.";
    return {
      description: desc,
      copyright: `© ${new Date().getFullYear()} ${brand} — All rights reserved.`,
      columns: DEFAULT_FOOTER_COLUMNS,
    };
  },

  async save(tenantId: string, input: FooterConfigInput): Promise<FooterContent> {
    const payload: Record<string, unknown> = {};
    if (input.description !== undefined) payload.description = input.description ?? null;
    if (input.copyright !== undefined) payload.copyright = input.copyright ?? null;
    if (input.columns !== undefined) payload.columns = normalizeColumns(input.columns);
    // merge with existing so partial updates don't wipe columns
    const existing = await SettingsService.getSettingByKey(tenantId, FOOTER_KEY);
    const merged = { ...((existing as Record<string, unknown>) ?? {}), ...payload };
    if (!merged.columns) merged.columns = DEFAULT_FOOTER_COLUMNS;
    await SettingsService.upsertSetting(tenantId, FOOTER_KEY, merged as never);
    return {
      description: (merged.description as string | null) ?? null,
      copyright: (merged.copyright as string | null) ?? null,
      columns: normalizeColumns(merged.columns),
    };
  },
};
