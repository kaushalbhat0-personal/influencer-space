export type ImportSource = "demo_seed" | "manual" | "youtube" | "instagram" | "twitch" | "website" | "tiktok" | "unknown";

export interface CreatorProfile {
  source: ImportSource;
  creatorName: string;
  brandName: string;
  tagline: string;
  bio: string;
  heroTitle: string;
  aboutText: string;
  tone: string;
  niche: string;
  audience: string;
  products: { name: string; price: number; description: string }[];
  services: string[];
  socialLinks: { platform: string; url: string }[];
  seoTitle: string;
  seoDesc: string;
  palette: { primary: string; secondary: string };
  logoUrl?: string;
  faq: { q: string; a: string }[];
  testimonials: { name: string; text: string }[];
  pages: string[];
  isDemo?: boolean;
  seedId?: string;
  channelId?: string;
}

export interface ImportAnalysisResult {
  confidence: number;
  completeness: number;
  warnings: string[];
  creatorProfile: CreatorProfile;
}

export interface CreatorImportAdapter {
  source: ImportSource;
  label: string;
  description: string;
  validate(input: string): { valid: boolean; error?: string };
  analyze(input: string): Promise<ImportAnalysisResult>;
}

export interface ImportRecord {
  id: string;
  source: ImportSource;
  input: string;
  creatorName: string;
  tenantId: string;
  storefrontUrl: string;
  status: "started" | "completed" | "failed";
  confidence: number;
  completeness: number;
  warnings: string[];
  duration: number;
  errors: string[];
  createdAt: string;
}

export interface ImportResult {
  success: boolean;
  tenantId: string;
  storefrontUrl: string;
  status: "published" | "failed";
  record: ImportRecord;
  error?: string;
}
