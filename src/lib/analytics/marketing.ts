export interface MarketingEvent {
  name: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

export function trackMarketingEvent(name: string, properties: Record<string, unknown> = {}): void {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log("[Marketing]", name, properties);
    }
  } catch {}
}

export const MarketingEvents = {
  heroViewed: () => trackMarketingEvent("marketing_hero_viewed", {}),
  heroCtaClicked: (label: string) => trackMarketingEvent("marketing_hero_cta_clicked", { cta_label: label, cta_location: "hero" }),
  heroInputFocused: () => trackMarketingEvent("marketing_heroinput_focused", { element: "hero_input" }),
  heroInputUrlEntered: (urlLength: number, platform: string | null) => trackMarketingEvent("marketing_heroinput_url_entered", { url_length: urlLength, platform }),
  heroInputSubmitted: (url: string, platform: string | null) => trackMarketingEvent("marketing_heroinput_submitted", { url, url_length: url.length, platform }),
  heroInputPlatformDetected: (platform: string | null) => trackMarketingEvent("marketing_heroinput_platform_detected", { platform }),
  sectionViewed: (sectionId: string, sectionName: string) => trackMarketingEvent("marketing_section_viewed", { section_id: sectionId, section_name: sectionName }),
  aiDemoStarted: (trigger: "auto" | "manual") => trackMarketingEvent("marketing_ai_demo_started", { trigger }),
  aiDemoCompleted: (durationMs: number, skipped: boolean) => trackMarketingEvent("marketing_ai_demo_completed", { duration_ms: durationMs, skipped }),
  aiDemoSkipped: (stage: number) => trackMarketingEvent("marketing_ai_demo_skipped", { stage_skipped_at: stage }),
  aiDemoReplay: (replays: number) => trackMarketingEvent("marketing_ai_demo_replay", { replays }),
  finalCtaClicked: (label: string) => trackMarketingEvent("marketing_final_cta_clicked", { cta_label: label, cta_location: "final" }),
} as const;
