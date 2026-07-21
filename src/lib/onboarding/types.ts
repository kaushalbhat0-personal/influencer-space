/**
 * Onboarding Types
 *
 * Creator and Agency onboarding flows with localStorage persistence.
 * North Star: Time to First Published Website (TTFPW).
 */

export type Persona = "creator" | "agency";

export type CreatorStep = "welcome" | "import" | "brand" | "generate" | "review" | "publish" | "success";
export type AgencyStep = "welcome" | "profile" | "invite" | "create-creator" | "generate" | "publish" | "success";

export const CREATOR_STEPS: CreatorStep[] = ["welcome", "import", "brand", "generate", "review", "publish", "success"];
export const AGENCY_STEPS: AgencyStep[] = ["welcome", "profile", "invite", "create-creator", "generate", "publish", "success"];

export interface OnboardingState {
  persona: Persona;
  planCode: string;

  // Creator fields
  sourceUrl: string;
  brandName: string;
  category: string;
  bio: string;
  brandTone: string;
  targetAudience: string;

  // AI generation result
  generatedContent: Record<string, unknown> | null;
  generatedTheme: Record<string, unknown> | null;
  storefrontUrl: string | null;
  dashboardUrl: string | null;

  // Agency fields
  agencyName: string;
  teamEmails: string[];
  creatorName: string;
  creatorUrl: string;

  // Flow state
  currentStepIndex: number;
  startedAt: string;
  completed: boolean;
}

export function defaultState(persona: Persona, planCode: string): OnboardingState {
  return {
    persona, planCode,
    sourceUrl: "", brandName: "", category: "", bio: "", brandTone: "", targetAudience: "",
    generatedContent: null, generatedTheme: null, storefrontUrl: null, dashboardUrl: null,
    agencyName: "", teamEmails: [], creatorName: "", creatorUrl: "",
    currentStepIndex: 0, startedAt: new Date().toISOString(), completed: false,
  };
}

const STORAGE_KEY = "creatorstore_onboarding";

export function saveOnboarding(state: OnboardingState): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* quota exceeded */ }
}

export function loadOnboarding(): OnboardingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Expire after 7 days
    if (Date.now() - new Date(parsed.startedAt).getTime() > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch { return null; }
}

export function clearOnboarding(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
}

// ── Analytics Events ───────────────────────────────────────────────────

export type OnboardingEvent =
  | "onboarding:started"
  | "onboarding:step:completed"
  | "onboarding:generation:started"
  | "onboarding:generation:completed"
  | "onboarding:published"
  | "onboarding:completed"
  | "onboarding:dropped";

export function trackOnboarding(event: OnboardingEvent, meta?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    console.log(`[Onboarding] ${event}`, meta ?? {});
    // Future: send to analytics provider
  } catch { /* */ }
}
