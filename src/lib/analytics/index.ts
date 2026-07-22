/**
 * CreatorStore Analytics v1.0.0
 *
 * Unified analytics abstraction. One tracking function for the entire platform.
 * Supports: console (dev), Vercel Analytics, future providers.
 *
 * Business Events (KPIs):
 *   landing:viewed, signup:started, signup:completed
 *   onboarding:started, onboarding:completed
 *   generation:started, generation:completed
 *   publish:started, publish:completed
 *   dashboard:opened, product:created, checkout:started
 *   order:completed, domain:connected, upgrade:started, upgrade:completed
 */

type AnalyticsEvent =
  | "landing:viewed"
  | "signup:started" | "signup:completed"
  | "onboarding:started" | "onboarding:step:completed" | "onboarding:completed"
  | "generation:started" | "generation:completed"
  | "provisioning:started" | "provisioning:completed" | "provisioning:failed"
  | "publish:started" | "publish:completed"
  | "dashboard:opened"
  | "product:created"
  | "checkout:started"
  | "order:completed"
  | "domain:connected"
  | "upgrade:started" | "upgrade:completed";

interface AnalyticsPayload {
  event: AnalyticsEvent;
  persona?: "creator" | "agency";
  planCode?: string;
  source?: string;
  duration?: number;
  meta?: Record<string, unknown>;
}

type AnalyticsProvider = (payload: AnalyticsPayload) => void;

const providers: AnalyticsProvider[] = [];

export function registerProvider(provider: AnalyticsProvider): void {
  providers.push(provider);
}

export function track(event: AnalyticsEvent, meta?: Record<string, unknown>): void {
  const payload: AnalyticsPayload = { event, meta };
  for (const p of providers) p(payload);
  if (process.env.NODE_ENV !== "production" && providers.length === 0) {
    console.log(`[Analytics] ${event}`, meta ?? {});
  }
}
