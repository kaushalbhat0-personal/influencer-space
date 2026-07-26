export interface SEOData {
  title: string | null;
  description: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  structuredData: Record<string, unknown> | null;
  robotsTxt: string | null;
  indexingEnabled: boolean;
  redirects: RedirectRule[];
}

export interface RedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
}

export interface SEOFormInput {
  title?: string;
  description?: string;
  ogImage?: string;
  canonicalUrl?: string;
  structuredData?: Record<string, unknown>;
  robotsTxt?: string;
  indexingEnabled?: boolean;
  redirects?: RedirectRule[];
}
