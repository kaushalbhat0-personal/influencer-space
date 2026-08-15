import type { ComparisonConfig } from "./types";

export const SEED_COMPARISONS: ComparisonConfig[] = [
  {
    id: "vs-link-in-bio",
    title: "CreatorStore vs. Link-in-Bio Tools",
    creatorStoreLabel: "CreatorStore",
    competitors: [
      { id: "linktree", name: "Linktree / Beacons / Stan" },
      { id: "website-builders", name: "Traditional Website Builders" },
    ],
    features: [
      {
        feature: "Storefront built from your social profile",
        creatorStore: true,
        competitorA: false,
        competitorB: false,
      },
      {
        feature: "Custom domain with free SSL",
        creatorStore: true,
        competitorA: "Paid only",
        competitorB: true,
      },
      {
        feature: "Digital products & downloads",
        creatorStore: true,
        competitorA: "Limited",
        competitorB: "Via plugins",
      },
      {
        feature: "Physical merchandise",
        creatorStore: true,
        competitorA: false,
        competitorB: "Via plugins",
      },
      {
        feature: "Courses & services showcase",
        creatorStore: true,
        competitorA: false,
        competitorB: "Via plugins",
      },
      {
        feature: "Coaching & bookings",
        creatorStore: true,
        competitorA: false,
        competitorB: "Via plugins",
      },
      {
        feature: "Native UPI & card checkout (Razorpay)",
        creatorStore: true,
        competitorA: "Link only",
        competitorB: "Via plugins",
      },
      {
        feature: "SEO-optimized pages",
        creatorStore: true,
        competitorA: false,
        competitorB: true,
      },
      {
        feature: "Analytics dashboard",
        creatorStore: true,
        competitorA: "Basic",
        competitorB: true,
      },
      {
        feature: "Visual drag-and-drop builder",
        creatorStore: true,
        competitorA: false,
        competitorB: true,
      },
      {
        feature: "Automated product & SEO content",
        creatorStore: true,
        competitorA: false,
        competitorB: false,
      },
      {
        feature: "Multi-client agency platform",
        creatorStore: true,
        competitorA: false,
        competitorB: false,
      },
      {
        feature: "White-label branding",
        creatorStore: true,
        competitorA: false,
        competitorB: "Paid only",
      },
      {
        feature: "Email capture forms",
        creatorStore: true,
        competitorA: "Limited",
        competitorB: "Via plugins",
      },
      {
        feature: "Social media integration",
        creatorStore: true,
        competitorA: true,
        competitorB: "Via plugins",
      },
    ],
  },
];
