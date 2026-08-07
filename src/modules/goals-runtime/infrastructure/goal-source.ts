// ── Goal Counts Source ──────────────────────────────────────
// Builds the canonical GoalCounts used by milestone checks. Counts come from
// the knowledge snapshot (deterministic) plus one live query for orders —
// milestones that depend on order volume need real order data.

import { prisma } from "@/lib/prisma";
import type { KnowledgeSnapshot } from "@/modules/knowledge-runtime";
import type { GoalCounts } from "../domain/types";

export function countsFromSnapshot(snapshot: KnowledgeSnapshot, orders = 0): GoalCounts {
  return {
    products: snapshot.commerce.productCount,
    bookings: snapshot.commerce.bookingCount,
    orders,
    courses: snapshot.commerce.courseCount,
    services: snapshot.commerce.serviceCount,
    testimonials: snapshot.trust.testimonialCount,
    gallery: snapshot.content.galleryCount,
    timeline: snapshot.trust.timelineCount,
    faq: snapshot.content.faqCount,
    contentFeed: snapshot.content.feedCount,
    affiliateLinks: snapshot.social.affiliateLinkCount,
  };
}

export async function buildGoalCounts(tenantId: string, snapshot: KnowledgeSnapshot): Promise<GoalCounts> {
  const orders = await prisma.productOrder.count({
    where: { tenantId, status: { in: ["PAID", "COMPLETED"] } },
  }).catch(() => 0);
  return countsFromSnapshot(snapshot, orders);
}
