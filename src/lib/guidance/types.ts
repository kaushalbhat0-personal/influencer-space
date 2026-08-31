export type GuidanceAudience = "creator" | "agency";

export interface GuidanceStep {
  id: string;
  title: string;
  description: string;
  hint?: string;
}

export interface GuidanceDefinition {
  id: string;
  audience: GuidanceAudience;
  title: string;
  description: string;
  steps: GuidanceStep[];
}

export interface HelpArticle {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  audience?: GuidanceAudience[];
}

export interface GuidanceState {
  completed: boolean;
  skipped: boolean;
  completedAt?: string;
  dismissedAt?: string;
}
