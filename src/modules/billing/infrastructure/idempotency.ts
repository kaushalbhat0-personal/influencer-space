/**
 * Billing v2 — Idempotency Service
 *
 * Ensures webhook events are processed exactly once.
 * Uses idempotencyKey for deduplication.
 *
 * In production, this checks the BillingEvent table.
 * In Phase 1/2A, it uses an in-memory Set for testing.
 */

export class BillingIdempotency {
  private processed = new Set<string>();

  /**
   * Check if an event has already been processed.
   * Returns true if this is a duplicate.
   */
  isDuplicate(idempotencyKey: string): boolean {
    if (this.processed.has(idempotencyKey)) return true;
    this.processed.add(idempotencyKey);
    return false;
  }

  /**
   * Mark an event as processed.
   */
  markProcessed(idempotencyKey: string): void {
    this.processed.add(idempotencyKey);
  }

  /**
   * Clear processed events (useful for testing).
   */
  reset(): void {
    this.processed.clear();
  }

  /**
   * Number of processed events (for debugging/monitoring).
   */
  get size(): number {
    return this.processed.size;
  }
}

export const billingIdempotency = new BillingIdempotency();
