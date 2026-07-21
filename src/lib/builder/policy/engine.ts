import type { PolicyName, InteractionContext, PolicyResult, PolicyDiagnostics } from "./types";
import { platformTelemetry } from "@/lib/telemetry/telemetry";

function allow(name: PolicyName): PolicyResult { return { allowed: true, policy: name, reason: null }; }
function deny(name: PolicyName, reason: string): PolicyResult { return { allowed: false, policy: name, reason }; }

const baseRules: Record<PolicyName, (ctx: InteractionContext) => PolicyResult> = {
  canSelect: (ctx) => {
    if (ctx.isLocked) return deny("canSelect", "Element is locked");
    return allow("canSelect");
  },
  canMove: (ctx) => {
    if (ctx.isReadOnly) return deny("canMove", "Canvas is read-only");
    if (ctx.isLocked) return deny("canMove", "Element is locked");
    if (ctx.isDraft) return deny("canMove", "Cannot move in draft mode");
    return allow("canMove");
  },
  canInsert: (ctx) => {
    if (ctx.isReadOnly) return deny("canInsert", "Canvas is read-only");
    if (ctx.isDraft) return deny("canInsert", "Cannot insert in draft mode");
    return allow("canInsert");
  },
  canDelete: (ctx) => {
    if (ctx.isReadOnly) return deny("canDelete", "Canvas is read-only");
    if (ctx.isLocked) return deny("canDelete", "Element is locked");
    if (ctx.isDraft) return deny("canDelete", "Cannot delete in draft mode");
    return allow("canDelete");
  },
  canDuplicate: (ctx) => {
    if (ctx.isReadOnly) return deny("canDuplicate", "Canvas is read-only");
    if (ctx.isLocked) return deny("canDuplicate", "Element is locked");
    if (ctx.isDraft) return deny("canDuplicate", "Cannot duplicate in draft mode");
    return allow("canDuplicate");
  },
  canResize: (ctx) => {
    if (ctx.isReadOnly) return deny("canResize", "Canvas is read-only");
    if (ctx.isLocked) return deny("canResize", "Element is locked");
    return allow("canResize");
  },
  canEdit: (ctx) => {
    if (ctx.isReadOnly) return deny("canEdit", "Canvas is read-only");
    if (ctx.isLocked) return deny("canEdit", "Element is locked");
    return allow("canEdit");
  },
  canPublish: (ctx) => {
    if (ctx.isReadOnly) return deny("canPublish", "Canvas is read-only");
    if (ctx.isLocked) return deny("canPublish", "Element is locked");
    return allow("canPublish");
  },
  canPreview: () => allow("canPreview"),
  canDrag: (ctx) => {
    if (ctx.isReadOnly) return deny("canDrag", "Canvas is read-only");
    if (ctx.isLocked) return deny("canDrag", "Element is locked");
    if (ctx.isHidden) return deny("canDrag", "Cannot drag hidden element");
    return allow("canDrag");
  },
};

export class InteractionPolicyEngine {
  private rules = new Map<PolicyName, (ctx: InteractionContext) => PolicyResult>();
  private evaluations = 0;
  private allowed = 0;
  private denied = 0;
  private byPolicy: Record<string, { allowed: number; denied: number }> = {};

  constructor() {
    for (const [name, fn] of Object.entries(baseRules)) {
      this.rules.set(name as PolicyName, fn);
      this.byPolicy[name] = { allowed: 0, denied: 0 };
    }
  }

  register(name: PolicyName, fn: (ctx: InteractionContext) => PolicyResult): void {
    this.rules.set(name, fn);
    if (!this.byPolicy[name]) this.byPolicy[name] = { allowed: 0, denied: 0 };
  }

  evaluate(name: PolicyName, ctx: InteractionContext): PolicyResult {
    this.evaluations++;
    const start = performance.now();
    const rule = this.rules.get(name);
    if (!rule) {
      this.denied++;
      return deny(name, `Unknown policy: "${name}"`);
    }
    const result = rule(ctx);
    if (result.allowed) { this.allowed++; this.byPolicy[name]!.allowed++; }
    else { this.denied++; this.byPolicy[name]!.denied++; }
    platformTelemetry.counter("builder.policy.evaluated", 1, { policy: name, allowed: String(result.allowed) });
    platformTelemetry.timer("builder.policy.evaluate", performance.now() - start);
    return result;
  }

  canExecute(name: PolicyName, ctx: InteractionContext): boolean {
    return this.evaluate(name, ctx).allowed;
  }

  getPolicy(name: PolicyName): ((ctx: InteractionContext) => PolicyResult) | null {
    return this.rules.get(name) ?? null;
  }

  diagnostics(): PolicyDiagnostics {
    return { totalEvaluations: this.evaluations, allowed: this.allowed, denied: this.denied, byPolicy: { ...this.byPolicy } };
  }
}

export const interactionPolicy = new InteractionPolicyEngine();
