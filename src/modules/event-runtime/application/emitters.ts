// ── Runtime Event Emitters (Phase 9) ────────────────────────
// Convenience emitter used by server actions so every runtime writes one line
// to the event layer. Best-effort: emitting never breaks the platform flow.

import { runtimeEventBus } from "./bus";
import type { IntelligenceEventType } from "../domain/types";

export async function emitEvent(
  type: IntelligenceEventType,
  tenantId: string,
  entityId?: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  await runtimeEventBus.publish({ type, tenantId, entityId, payload, occurredAt: new Date().toISOString() });
}
