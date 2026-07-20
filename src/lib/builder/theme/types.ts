export type TokenCategory =
  | "color" | "typography" | "spacing" | "radius"
  | "shadow" | "border" | "opacity" | "motion"
  | "breakpoint" | "zIndex" | "custom";

export type TokenSource = "system" | "theme" | "user";

export interface ThemeToken {
  key: string;
  value: string;
  category: TokenCategory;
  description?: string;
  group?: string;
  responsive?: Record<string, string>;
  deprecated?: boolean;
  replacedBy?: string;
  editable: boolean;
  source: TokenSource;
  aliases?: string[];
}

export interface ThemeTokenGroup {
  id: string;
  label: string;
  category: TokenCategory;
  tokens: ThemeToken[];
}

export interface ThemeDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  groups: ThemeTokenGroup[];
  metadata: Record<string, unknown>;
}

export type ResolvedTheme = Record<string, string>;

export interface ThemeQuery {
  category?: TokenCategory;
  group?: string;
  search?: string;
  deprecated?: boolean;
}

export interface ThemeDiagnostics {
  totalTokens: number;
  totalGroups: number;
  missingTokens: string[];
  duplicateTokens: string[];
  circularReferences: string[][];
  invalidReferences: { key: string; reference: string }[];
  unusedTokens: string[];
}

export interface SerializedTheme {
  version: string;
  themeId: string;
  name: string;
  exportedAt: string;
  tokens: Record<string, { value: string; category: TokenCategory; group?: string }>;
  metadata: Record<string, unknown>;
}
