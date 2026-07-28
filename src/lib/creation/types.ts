export interface CreatorProfile {
  tenantId: string;
  name: string;
  tagline: string;
  bio: string;
  avatarUrl: string | null;
}

export interface GenerationContext {
  creator: CreatorProfile;
  industryId?: string;
  styleId?: string;
  blueprintId?: string;
  themeId?: string;
  capabilities?: string[];
  locale?: string;
  timezone?: string;
  currency?: string;
}

export interface GenerationResult {
  blueprintId: string;
  themeId: string;
  pages: GeneratedPage[];
  navigation: GeneratedNavItem[];
  themeVariant: "light" | "dark";
}

export interface GeneratedPage {
  id: string;
  name: string;
  slug: string;
  isHome: boolean;
  order: number;
  sections: GeneratedSection[];
}

export interface GeneratedSection {
  id: string;
  moduleId: string;
  order: number;
  visible: boolean;
  config: Record<string, unknown>;
}

export interface GeneratedNavItem {
  id: string;
  label: string;
  href: string;
  type: "page" | "anchor" | "external";
  order: number;
  visible: boolean;
}

export interface GenerationStep {
  id: string;
  label: string;
  description: string;
  order: number;
  optional: boolean;
}

export interface WizardState {
  currentStep: number;
  industryId: string | null;
  styleId: string | null;
  blueprintId: string | null;
  themeId: string | null;
  completed: boolean;
}

export interface PreviewSession {
  id: string;
  blueprintId: string;
  themeId: string;
  themeVariant: "light" | "dark";
  pages: GeneratedPage[];
  navigation: GeneratedNavItem[];
  createdAt: Date;
}

// ── Canonical WebsiteDefinition ─────────────────────────
export interface WebsiteDefinition {
  tenantName: string;
  creatorName: string;
  creatorEmail: string;
  tagline?: string;
  bio?: string;
  avatarUrl?: string;
  blueprintId: string;
  themeId: string;
  themeVariant: "light" | "dark";
  pages: GeneratedPage[];
  navigation: GeneratedNavItem[];
  source: "ai" | "blueprint" | "manual" | "import" | "marketplace" | "clone" | "agency";
  capabilities?: string[];
}
