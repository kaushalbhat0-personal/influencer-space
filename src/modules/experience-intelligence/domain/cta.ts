// ── CTA Intelligence (Phase 5) ──────────────────────────────
// Every page gets a deterministic primary/secondary CTA based on the creator's
// primary goal. No hardcoded CTAs anywhere else — this registry is canonical.

import type { GoalId, GoalProfile } from "@/modules/goals-runtime";
import { primaryGoal } from "@/modules/goals-runtime/application/weights";
import type { CTAPlan } from "./types";

const CTA_BY_GOAL: Record<GoalId, CTAPlan> = {
  GET_BOOKINGS: { primary: "Book Now", secondary: "View Availability" },
  SELL_PRODUCTS: { primary: "Buy Now", secondary: "Browse Products" },
  SELL_COURSES: { primary: "Start Learning", secondary: "View Courses" },
  SELL_SERVICES: { primary: "Get a Quote", secondary: "Book a Call" },
  BUILD_EMAIL_LIST: { primary: "Subscribe", secondary: "Get the Newsletter" },
  GROW_YOUTUBE: { primary: "Subscribe", secondary: "Watch Latest" },
  BUILD_COMMUNITY: { primary: "Join Community", secondary: "Connect" },
  SHOW_PORTFOLIO: { primary: "Contact Me", secondary: "View Portfolio" },
  GENERATE_LEADS: { primary: "Get a Quote", secondary: "Contact" },
  PROMOTE_EVENTS: { primary: "Get Tickets", secondary: "View Events" },
  FIND_CLIENTS: { primary: "Hire Me", secondary: "View Work" },
  BUILD_BRAND: { primary: "Explore", secondary: "About" },
  INCREASE_TRUST: { primary: "Get Started", secondary: "See Results" },
  MONETIZE_CONTENT: { primary: "Shop Now", secondary: "Browse" },
};

const DEFAULT_CTA: CTAPlan = { primary: "Get Started", secondary: "Learn More" };

export function ctaFor(goalId: GoalId): CTAPlan {
  return CTA_BY_GOAL[goalId] ?? DEFAULT_CTA;
}

export function ctaForProfile(profile: GoalProfile | null): CTAPlan {
  const primary = primaryGoal(profile);
  return primary ? ctaFor(primary.goalId) : DEFAULT_CTA;
}
