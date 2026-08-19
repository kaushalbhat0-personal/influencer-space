/**
 * Shared structured content-limit error contract — RCCF-72.10.
 *
 * Server actions that gate a content write behind `enforceContentLimit` must
 * NOT throw the raw rejection across the server-action boundary (the client
 * cannot reliably surface the message). Instead they return a discriminated
 * result that the client UI can inspect: success carries the created data,
 * rejection carries the friendly reason plus limit context.
 *
 * The shape follows the established Games/Bookings structured-error contract
 * (`{ success: boolean; error?: string }`) and is shared by every commerce
 * write surface so the error taxonomy is not duplicated per feature.
 */
import type { ContentLimitDecision } from "./content-limit.enforcement";

export interface ContentFailure {
  success: false;
  error: string;
}

export interface ContentLimitRejection extends ContentFailure {
  featureKey: string;
  used: number;
  limit: number;
  suggestedUpgrade?: string;
}

export type ContentMutationResult<T> = { success: true; data: T } | ContentFailure;

export function contentLimitRejection(decision: ContentLimitDecision): ContentLimitRejection {
  return {
    success: false,
    error: decision.reason ?? "Limit reached for this plan.",
    featureKey: decision.featureKey,
    used: decision.used,
    limit: decision.limit,
    suggestedUpgrade: decision.suggestedUpgrade,
  };
}