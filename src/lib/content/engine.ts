import type { ContentEntity, ContentCommand, ContentCommandResult, ContentPolicyContext, ContentPolicyFn, ContentValidationResult, ContentDiagnostics } from "./types";
import { contentRegistry } from "./registry";
import { platformTelemetry } from "@/lib/telemetry/telemetry";

let entityCounter = Date.now();
function uid(): string { return `cnt_${++entityCounter}`; }

export class ContentEventBus {
  private handlers = new Map<string, Array<(payload: Record<string, unknown>) => void>>();
  private emitted = 0;

  on(event: string, handler: (payload: Record<string, unknown>) => void): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
    return () => { const arr = this.handlers.get(event); if (arr) { const idx = arr.indexOf(handler); if (idx >= 0) arr.splice(idx, 1); } };
  }

  emit(event: string, payload: Record<string, unknown>): void {
    this.emitted++;
    const handlers = this.handlers.get(event);
    if (handlers) { for (const h of handlers) { try { h(payload); } catch { /* isolate */ } } }
    platformTelemetry.counter("content.event.emitted", 1, { event });
  }

  listenerCount(): number { let c = 0; for (const h of Array.from(this.handlers.values())) c += h.length; return c; }
}

export class ContentCommandBus {
  private history: ContentCommandResult[] = [];
  private undoStack: ContentCommandResult[] = [];
  private commands = new Map<string, (cmd: ContentCommand) => ContentCommandResult>();

  constructor(private events: ContentEventBus, private validator: ContentValidationEngine, private policies: ContentPolicyEngine) {}

  register(name: string, handler: (cmd: ContentCommand) => ContentCommandResult): void { this.commands.set(name, handler); }

  execute(cmd: ContentCommand): ContentCommandResult {
    const handler = this.commands.get(cmd.name);
    if (!handler) return { success: false, commandId: "", commandName: cmd.name, entityId: null, data: null, error: `Unknown command: "${cmd.name}"` };

    const start = performance.now();
    try {
      const result = handler(cmd);
      if (result.success) { this.history.push(result); this.undoStack.push(result); }
      platformTelemetry.timer("content.command.execute", performance.now() - start);
      return result;
    } catch (e) {
      return { success: false, commandId: "", commandName: cmd.name, entityId: null, data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }

  getHistory(): ContentCommandResult[] { return [...this.history]; }
  get size(): number { return this.commands.size; }
}

export class ContentTransactionManager {
  private snapshots = new Map<string, ContentEntity>();
  private active = false;

  begin(): void {
    this.snapshots.clear();
    for (const entity of contentRegistry.getAll()) { this.snapshots.set(entity.id, { ...entity }); }
    this.active = true;
  }

  commit(): void { this.snapshots.clear(); this.active = false; }
  rollback(): void {
    contentRegistry.getAll().forEach((e) => contentRegistry.delete(e.id));
    for (const [, entity] of Array.from(this.snapshots.entries())) { contentRegistry.register(entity); }
    this.snapshots.clear(); this.active = false;
  }

  isActive(): boolean { return this.active; }
}

export class ContentValidationEngine {
  validate(entity: ContentEntity): ContentValidationResult {
    const errors: { field: string; message: string }[] = [];
    if (!entity.id) errors.push({ field: "id", message: "ID is required" });
    if (!entity.type) errors.push({ field: "type", message: "Type is required" });
    if (!entity.tenantId) errors.push({ field: "tenantId", message: "Tenant ID is required" });
    if (!entity.slug) errors.push({ field: "slug", message: "Slug is required" });
    return { valid: errors.length === 0, errors };
  }
}

export class ContentPolicyEngine {
  private policies = new Map<string, ContentPolicyFn>();

  register(name: string, fn: ContentPolicyFn): void { this.policies.set(name, fn); }

  evaluate(name: string, ctx: ContentPolicyContext): { allowed: boolean; reason?: string } {
    const fn = this.policies.get(name);
    return fn ? fn(ctx) : { allowed: true };
  }

  canCreate(ctx: ContentPolicyContext): boolean { return this.evaluate("canCreate", ctx).allowed; }
  canEdit(ctx: ContentPolicyContext): boolean { return this.evaluate("canEdit", ctx).allowed; }
  canDelete(ctx: ContentPolicyContext): boolean { return this.evaluate("canDelete", ctx).allowed; }

  get size(): number { return this.policies.size; }
}

export class ContentDiagnosticsEngine {
  run(events: ContentEventBus, commands: ContentCommandBus): ContentDiagnostics {
    return {
      registeredTypes: contentRegistry.typeCount,
      entityCounts: Object.fromEntries(Array.from(new Set(contentRegistry.getAll().map((e) => e.type))).map((t) => [t, contentRegistry.count({ type: t })])),
      commandCount: commands.size,
      queryCount: 0,
      eventCount: events.listenerCount(),
      errors: [],
    };
  }
}

export class ContentSerializer {
  serialize(): string {
    return JSON.stringify({
      types: contentRegistry.listTypes(),
      entities: contentRegistry.getAll(),
      exportedAt: new Date().toISOString(),
      version: "1.0.0",
    }, null, 2);
  }

  deserialize(json: string): { success: boolean; imported: number; error?: string } {
    try {
      const data = JSON.parse(json);
      if (!data.entities) return { success: false, imported: 0, error: "Invalid format" };
      let count = 0;
      for (const entity of data.entities) { contentRegistry.register(entity); count++; }
      return { success: true, imported: count };
    } catch (e) { return { success: false, imported: 0, error: e instanceof Error ? e.message : String(e) }; }
  }
}

const contentEvents = new ContentEventBus();
const contentValidator = new ContentValidationEngine();
const contentPolicies = new ContentPolicyEngine();
const contentCommands = new ContentCommandBus(contentEvents, contentValidator, contentPolicies);
const contentTransactions = new ContentTransactionManager();
const contentDiagnostics = new ContentDiagnosticsEngine();
const contentSerializer = new ContentSerializer();

contentPolicies.register("canCreate", () => ({ allowed: true }));
contentPolicies.register("canEdit", () => ({ allowed: true }));
contentPolicies.register("canDelete", () => ({ allowed: true }));

contentCommands.register("create", (cmd) => {
  const entity: ContentEntity = {
    id: uid(), type: cmd.type, tenantId: (cmd.input.tenantId as string) ?? "", slug: (cmd.input.slug as string) ?? uid(),
    status: "draft", visibility: "public", data: cmd.input.data as Record<string, unknown> ?? {}, metadata: {},
    tags: (cmd.input.tags as string[]) ?? [], version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const validation = contentValidator.validate(entity);
  if (!validation.valid) return { success: false, commandId: uid(), commandName: "create", entityId: null, data: null, error: validation.errors.map((e) => e.message).join(", ") };
  contentRegistry.register(entity);
  contentEvents.emit("content:created", { entityId: entity.id, type: entity.type, tenantId: entity.tenantId });
  return { success: true, commandId: uid(), commandName: "create", entityId: entity.id, data: entity, error: null };
});

contentCommands.register("update", (cmd) => {
  const id = cmd.input.id as string;
  if (!id) return { success: false, commandId: uid(), commandName: "update", entityId: null, data: null, error: "id is required" };
  const updated = contentRegistry.update(id, { data: cmd.input.data as Record<string, unknown> });
  if (!updated) return { success: false, commandId: uid(), commandName: "update", entityId: id, data: null, error: "Entity not found" };
  contentEvents.emit("content:updated", { entityId: id });
  return { success: true, commandId: uid(), commandName: "update", entityId: id, data: updated, error: null };
});

contentCommands.register("delete", (cmd) => {
  const id = cmd.input.id as string;
  if (!id) return { success: false, commandId: uid(), commandName: "delete", entityId: null, data: null, error: "id is required" };
  if (!contentRegistry.delete(id)) return { success: false, commandId: uid(), commandName: "delete", entityId: id, data: null, error: "Entity not found" };
  contentEvents.emit("content:deleted", { entityId: id });
  return { success: true, commandId: uid(), commandName: "delete", entityId: id, data: null, error: null };
});

contentCommands.register("publish", (cmd) => {
  const id = cmd.input.id as string;
  const updated = contentRegistry.update(id, { status: "published" });
  if (!updated) return { success: false, commandId: uid(), commandName: "publish", entityId: id, data: null, error: "Entity not found" };
  contentEvents.emit("content:published", { entityId: id });
  return { success: true, commandId: uid(), commandName: "publish", entityId: id, data: updated, error: null };
});

contentCommands.register("archive", (cmd) => {
  const id = cmd.input.id as string;
  const updated = contentRegistry.update(id, { status: "archived" });
  if (!updated) return { success: false, commandId: uid(), commandName: "archive", entityId: id, data: null, error: "Entity not found" };
  contentEvents.emit("content:archived", { entityId: id });
  return { success: true, commandId: uid(), commandName: "archive", entityId: id, data: updated, error: null };
});

export {
  contentEvents,
  contentCommands,
  contentTransactions,
  contentValidator,
  contentPolicies,
  contentDiagnostics,
  contentSerializer,
};
