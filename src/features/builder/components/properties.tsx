"use client";

import { WebsitePanel } from "./website-panel";
import type { BuilderOverviewData } from "@/actions/builder-overview.actions";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  currentThemeId: string | null;
  planCode?: string | null;
  completionPct: number;
  onThemePreview: (themeId: string) => void;
  previewThemeId: string | null;
  onApplyTheme: (themeId: string) => void;
  overview?: BuilderOverviewData | null;
  tenantId?: string | null;
  onAppearanceRefresh?: () => Promise<void> | void;
}

export function BuilderProperties(props: Props) {
  return <WebsitePanel {...props} />;
}
