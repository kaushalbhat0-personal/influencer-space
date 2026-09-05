"use client";

import { WebsitePanel } from "./website-panel";
import type { BuilderOverviewData } from "@/actions/builder-overview.actions";
import type { AppearanceState } from "./appearance-panel";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  currentThemeId: string | null;
  planCode?: string | null;
  healthScore: number | null;
  completionPct?: number | null;
  onThemePreview: (themeId: string) => void;
  previewThemeId: string | null;
  onApplyTheme: (themeId: string) => void;
  overview?: BuilderOverviewData | null;
  tenantId?: string | null;
  onAppearanceRefresh?: () => Promise<void> | void;
  appearanceDraft?: AppearanceState | null;
  onAppearancePreviewChange?: (next: AppearanceState) => void;
}

export function BuilderProperties(props: Props) {
  const normalized = { ...props, healthScore: props.healthScore ?? props.completionPct ?? null } as typeof props & { healthScore: number | null };
  return <WebsitePanel {...normalized} />;
}
