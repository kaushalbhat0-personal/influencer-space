import type { WorkflowTrigger, TriggerContext } from "./interface";
import { triggerRegistry } from "./registry";

const BUILTIN_TRIGGERS: WorkflowTrigger[] = [
  {
    id: "creator.imported",
    description: "A new creator has been imported",
    match: (_ctx: TriggerContext) => _ctx.data?.status === "completed" || _ctx.data?.event === "imported",
  },
  {
    id: "website.published",
    description: "A website has been published",
    match: (_ctx: TriggerContext) => _ctx.data?.event === "published" || _ctx.data?.status === "live",
  },
  {
    id: "purchase.completed",
    description: "A purchase has been completed",
    match: (_ctx: TriggerContext) => _ctx.data?.status === "completed" || _ctx.data?.event === "payment.completed",
  },
  {
    id: "asset.uploaded",
    description: "An asset has been uploaded",
    match: () => true, // Matches all asset uploads
  },
];

export function registerBuiltinTriggers(): void {
  for (const t of BUILTIN_TRIGGERS) {
    triggerRegistry.register(t);
  }
}
