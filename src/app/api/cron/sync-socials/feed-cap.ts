/**
 * RCCF-27: number of NEW feed items a sync may create from a content-limit
 * decision. A limit of `-1` means unlimited — headroom must be unbounded,
 * otherwise `limit - used` is negative and every new item is skipped, so
 * Scale live social sync can never populate a fresh feed.
 */
export function maxNewFeedItems(decision: { ok: boolean; limit: number; used: number }): number {
  if (decision.limit === -1) return Number.POSITIVE_INFINITY;
  return decision.ok ? Math.max(0, decision.limit - decision.used) : 0;
}
