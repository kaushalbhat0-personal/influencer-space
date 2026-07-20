import type { ConstraintName, ConstraintContext, ConstraintFn, ConstraintResult, ConstraintDiagnostics, ModuleConstraint } from "./types";
import { platformTelemetry } from "@/lib/telemetry/telemetry";

function ok(name: string): ConstraintResult { return { valid: true, constraint: name, message: null, data: null }; }
function fail(name: string, msg: string): ConstraintResult { return { valid: false, constraint: name, message: msg, data: null }; }

const resolver = (ctx: ConstraintContext) => {
  const sectionSlots = (sid: string | null) => {
    for (const page of ctx.canvas.pages) for (const s of page.sections) {
      const section = s as { id?: string; slots: Array<{ id: string }> };
      if (section.id === sid) return section.slots;
    }
    return [];
  };
  return { sectionSlots };
};

const builtinConstraints: Record<string, ConstraintFn> = {
  "max-children": (ctx) => {
    if (!ctx.targetSectionId) return ok("max-children");
    const slots = resolver(ctx).sectionSlots(ctx.targetSectionId);
    return slots.length < 20 ? ok("max-children") : fail("max-children", "Section has reached maximum of 20 children");
  },
  "min-children": (ctx) => {
    if (!ctx.targetSectionId) return ok("min-children");
    const slots = resolver(ctx).sectionSlots(ctx.targetSectionId);
    return slots.length > 0 ? ok("min-children") : fail("min-children", "Section requires at least 1 child");
  },
  "allowed-parents": (ctx) => {
    if (!ctx.moduleId) return ok("allowed-parents");
    return ok("allowed-parents");
  },
  "allowed-children": (ctx) => {
    if (!ctx.moduleId) return ok("allowed-children");
    return ok("allowed-children");
  },
  "layout-rules": (ctx) => {
    if (!ctx.targetSectionId) return ok("layout-rules");
    const slots = resolver(ctx).sectionSlots(ctx.targetSectionId);
    if (slots.length >= 12) return fail("layout-rules", "Grid layout supports maximum 12 items per section");
    return ok("layout-rules");
  },
  "locked-container": (ctx) => {
    if (!ctx.targetSectionId) return ok("locked-container");
    return ok("locked-container");
  },
  "required-modules": (ctx) => {
    const page = ctx.canvas.pages[0];
    if (!page) return ok("required-modules");
    const hasHeader = page.sections.some((s) => s.slots.some((sl) => sl.id.startsWith("hero")));
    if (!hasHeader) return fail("required-modules", "Page requires at least one Hero module");
    return ok("required-modules");
  },
  "responsive-restrictions": (ctx) => {
    if (ctx.device === "mobile") {
      const totalSlots = ctx.canvas.pages.reduce((s, p) => s + p.sections.reduce((ss, sec) => ss + sec.slots.length, 0), 0);
      if (totalSlots > 10) return fail("responsive-restrictions", "Mobile viewport supports maximum 10 modules");
    }
    return ok("responsive-restrictions");
  },
  "reserved-areas": () => {
    return ok("reserved-areas");
  },
  "no-self-parent": (ctx) => {
    if (ctx.elementId && ctx.targetSectionId && ctx.elementId === ctx.targetSectionId) {
      return fail("no-self-parent", "Cannot move element into itself");
    }
    return ok("no-self-parent");
  },
  "no-duplicate-root": () => {
    return ok("no-duplicate-root");
  },
};

export class ConstraintEngine {
  private constraints = new Map<ConstraintName, ConstraintFn>();
  private moduleConstraints = new Map<string, ModuleConstraint>();
  private evaluations = 0;
  private passed = 0;
  private failed = 0;
  private byConstraint: Record<string, { passed: number; failed: number }> = {};

  constructor() {
    for (const [name, fn] of Object.entries(builtinConstraints)) {
      this.constraints.set(name, fn);
      this.byConstraint[name] = { passed: 0, failed: 0 };
    }
  }

  register(name: ConstraintName, fn: ConstraintFn): void {
    this.constraints.set(name, fn);
    if (!this.byConstraint[name]) this.byConstraint[name] = { passed: 0, failed: 0 };
  }

  registerModule(moduleId: string, constraint: ModuleConstraint): void {
    this.moduleConstraints.set(moduleId, constraint);
  }

  getModuleConstraint(moduleId: string): ModuleConstraint | null {
    return this.moduleConstraints.get(moduleId) ?? null;
  }

  evaluate(name: ConstraintName, ctx: ConstraintContext): ConstraintResult {
    this.evaluations++;
    const start = performance.now();
    const fn = this.constraints.get(name);
    if (!fn) { this.failed++; return fail(name, `Unknown constraint: "${name}"`); }
    const result = fn(ctx);
    if (result.valid) { this.passed++; this.byConstraint[name]!.passed++; }
    else { this.failed++; this.byConstraint[name]!.failed++; }
    platformTelemetry.counter("builder.constraint.evaluated", 1, { constraint: name, valid: String(result.valid) });
    platformTelemetry.timer("builder.constraint.evaluate", performance.now() - start);
    return result;
  }

  evaluateAll(ctx: ConstraintContext): ConstraintResult[] {
    return Array.from(this.constraints.keys()).map((name) => this.evaluate(name, ctx));
  }

  validate(ctx: ConstraintContext): { valid: boolean; results: ConstraintResult[]; errors: string[] } {
    const results = this.evaluateAll(ctx);
    const errors = results.filter((r) => !r.valid).map((r) => r.message!).filter(Boolean);
    return { valid: errors.length === 0, results, errors };
  }

  getValidParents(moduleId: string): string[] {
    const mc = this.moduleConstraints.get(moduleId);
    return mc?.allowedParents ?? [];
  }

  getValidChildren(moduleId: string): string[] {
    const mc = this.moduleConstraints.get(moduleId);
    return mc?.allowedChildren ?? [];
  }

  list(): ConstraintName[] { return Array.from(this.constraints.keys()); }

  diagnostics(): ConstraintDiagnostics {
    return { totalEvaluations: this.evaluations, passed: this.passed, failed: this.failed, byConstraint: { ...this.byConstraint } };
  }
}

export const constraintEngine = new ConstraintEngine();
