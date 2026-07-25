export interface GenerateWebsiteInput {
  source: string;
  template?: string;
  strategy?: string;
  skipAI?: boolean;
  forceTheme?: string;
  adminEmail?: string;
  subdomain?: string;
  sections?: string[];
}

export interface GeneratedContent {
  heroTitle?: string;
  heroSubtitle?: string;
  heroCta?: string;
  aboutSection?: string;
  tagline?: string;
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
}

export interface GeneratedTheme {
  preset?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  layoutDensity?: string;
  darkMode?: boolean;
}

export interface GenerateWebsiteResult {
  creatorName: string;
  sourcePlatform: string;
  generatedContent: GeneratedContent | null;
  generatedTheme: GeneratedTheme | null;
  generatedSections: string[];
  stages: Array<{ stage: string; status: string; error?: string }>;
  totalDurationMs: number;
  errors: string[];
  success: boolean;
  suggestions?: string[];
}
