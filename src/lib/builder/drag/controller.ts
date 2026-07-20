import type { ElementId } from "../types";
import type { DragTarget, DragSession, DragDiagnostics, DragContext, CanvasEdge } from "./types";
import { builderQuery } from "../query";
import { builderEvents } from "../events";
import { builderCommands } from "../commands";
import { interactionPolicy } from "../policy";
import { constraintEngine } from "../constraints";
import { documentValidator } from "../validation";
import { platformTelemetry } from "@/lib/telemetry/telemetry";
import { selectStrategy, moveStrategy } from "./strategies";
import type { DragStrategy } from "./strategies";

function edgeFromPosition(x: number, y: number, viewportW: number, _viewportH: number, threshold = 40): CanvasEdge {
  if (x < threshold) return "left";
  if (x > viewportW - threshold) return "right";
  if (y < threshold) return "top";
  if (y > _viewportH - threshold) return "bottom";
  return "none";
}

export class DragController {
  private session: DragSession;
  private activeStrategy: DragStrategy = moveStrategy;
  private totalSessions = 0;
  private completedSessions = 0;
  private cancelledSessions = 0;
  private totalDuration = 0;
  private totalDistance = 0;

  constructor() {
    this.session = this.emptySession();
  }

  private emptySession(): DragSession {
    return { status: "idle", source: null, position: null, currentTarget: null, edge: "none", startedAt: null, distance: 0, modifierKeys: { shift: false, alt: false, ctrl: false } };
  }

  get active(): boolean { return this.session.status === "dragging"; }
  get current(): DragSession { return { ...this.session }; }
  get strategy(): DragStrategy { return this.activeStrategy; }

  getContext(): DragContext {
    const selection = builderQuery.getSelection();
    const selSnapshot = { ids: selection.ids, count: selection.count, mode: selection.mode };
    const target = this.session.currentTarget ?? { elementId: null, sectionId: null, dropZone: "none" as const, valid: false, reason: null };
    return {
      session: { ...this.session },
      strategy: this.activeStrategy,
      target,
      snap: null,
      selection: selSnapshot,
      modifiers: { ...this.session.modifierKeys },
      device: builderQuery.getDevice(),
      timestamp: Date.now(),
    };
  }

  begin(elementId: ElementId, clientX: number, clientY: number, viewportW: number, _viewportH: number): { allowed: boolean; reason?: string } {
    void _viewportH;
    const hierarchy = builderQuery.getCanvasHierarchy();
    if (!hierarchy.page) return { allowed: false, reason: "No active page" };

    const slot = hierarchy.slots.find((s) => s.id === elementId);
    if (!slot) return { allowed: false, reason: "Element not found" };

    const section = hierarchy.sections.find((s) => s.slots.some((sl) => sl.id === elementId));
    if (!section) return { allowed: false, reason: "Parent section not found" };

    const policy = interactionPolicy.evaluate("canDrag", {
      elementId, sectionId: section.id, pageId: hierarchy.page.id,
      role: "ADMIN", plan: "PRO", isLocked: slot.locked, isHidden: !slot.visible,
      isReadOnly: false, isDraft: false, metadata: {},
    });
    if (!policy.allowed) return { allowed: false, reason: policy.reason ?? "Policy denied drag" };

    const rect = { width: viewportW / 10, height: 40 };

    this.totalSessions++;
    this.session = {
      status: "dragging",
      source: { elementId, moduleId: slot.moduleId, parentSectionId: section.id, elementIndex: section.slots.indexOf(slot), elementWidth: rect.width, elementHeight: rect.height },
      position: { x: clientX, y: clientY, offsetX: 0, offsetY: 0, pageX: clientX, pageY: clientY },
      currentTarget: null,
      edge: "none",
      startedAt: Date.now(),
      distance: 0,
      modifierKeys: { shift: false, alt: false, ctrl: false },
    };

    platformTelemetry.counter("builder.drag.started", 1);
    builderEvents.emit("drag:started" as never, { elementId, parentSectionId: section.id } as never);
    return { allowed: true };
  }

  update(clientX: number, clientY: number, viewportW: number, viewportH: number, modifiers?: { shift?: boolean; alt?: boolean; ctrl?: boolean }): void {
    if (this.session.status !== "dragging" || !this.session.position) return;
    const prev = this.session.position;
    const dx = clientX - prev.x;
    const dy = clientY - prev.y;
    this.session.position = { ...prev, x: clientX, y: clientY, pageX: clientX, pageY: clientY };
    this.session.distance += Math.sqrt(dx * dx + dy * dy);
    this.session.edge = edgeFromPosition(clientX, clientY, viewportW, viewportH);
    if (modifiers) {
      this.session.modifierKeys = { shift: !!modifiers.shift, alt: !!modifiers.alt, ctrl: !!modifiers.ctrl };
      this.activeStrategy = selectStrategy(modifiers);
    }

    const prevTarget = this.session.currentTarget;
    const newTarget = this.computeTargetWithStrategy(clientX, clientY);
    this.session.currentTarget = newTarget;

    if (prevTarget?.elementId !== newTarget.elementId || prevTarget?.dropZone !== newTarget.dropZone) {
      builderEvents.emit("drag:targetChanged" as never, {
        previousElementId: prevTarget?.elementId ?? null,
        newElementId: newTarget.elementId,
        dropZone: newTarget.dropZone,
      } as never);
    }

    if (this.session.edge !== "none") {
      builderEvents.emit("drag:autoScroll" as never, { edge: this.session.edge } as never);
    }

    builderEvents.emit("drag:updated" as never, { x: clientX, y: clientY, targetId: newTarget.elementId } as never);
    platformTelemetry.timer("builder.drag.move", 1);
  }

  cancel(): void {
    if (this.session.status !== "dragging") return;
    this.cancelledSessions++;
    const duration = this.session.startedAt ? Date.now() - this.session.startedAt : 0;
    this.totalDuration += duration;
    this.totalDistance += this.session.distance;
    builderEvents.emit("drag:cancelled" as never, { elementId: this.session.source?.elementId ?? null } as never);
    platformTelemetry.counter("builder.drag.cancelled", 1);
    this.session = this.emptySession();
    this.activeStrategy = moveStrategy;
  }

  complete(): DragTarget | null {
    if (this.session.status !== "dragging") return null;
    const source = this.session.source;
    const target = this.session.currentTarget;
    if (!source || !target || !target.valid || !target.sectionId) {
      return this.cleanupAndReturn(null);
    }

    const hierarchy = builderQuery.getCanvasHierarchy();
    const targetSection = hierarchy.sections.find((s) => s.id === target.sectionId);
    const targetIndex = targetSection ? targetSection.slots.length : 0;

    const resolved = this.activeStrategy.resolve(source, target.sectionId, targetIndex);
    if (resolved) {
      builderCommands.beginTransaction(`drag_${Date.now()}`);
      const result = builderCommands.execute(resolved.command, resolved.input);
      builderCommands.endTransaction();

      if (result.success) {
        builderCommands.execute("selectNode", { elementId: source.elementId });
        const canvas = { pages: builderQuery.getCurrentPage() ? [builderQuery.getCurrentPage()!] : [] };
        documentValidator.validate(canvas as Parameters<typeof documentValidator.validate>[0]);
      }
    }

    this.completedSessions++;
    const duration = this.session.startedAt ? Date.now() - this.session.startedAt : 0;
    this.totalDuration += duration;
    this.totalDistance += this.session.distance;
    builderEvents.emit("drag:completed" as never, {
      elementId: source.elementId,
      targetSectionId: target.sectionId,
      dropZone: target.dropZone,
      valid: target.valid,
    } as never);
    builderEvents.emit("transaction:committed" as never, { transactionId: `drag_${Date.now()}`, commandCount: 1 } as never);
    platformTelemetry.counter("builder.drag.completed", 1);
    return this.cleanupAndReturn(target);
  }

  private cleanupAndReturn(target: DragTarget | null): DragTarget | null {
    this.session = this.emptySession();
    this.activeStrategy = moveStrategy;
    return target;
  }

  private computeTargetWithStrategy(_clientX: number, _clientY: number): DragTarget {
    void _clientX; void _clientY;
    const hierarchy = builderQuery.getCanvasHierarchy();
    const sections = hierarchy.sections;
    if (sections.length === 0) return { elementId: null, sectionId: null, dropZone: "none", valid: false, reason: "No sections on page" };

    const targetSection = sections[0]!;
    const ctx = {
      elementId: this.session.source?.elementId ?? null,
      moduleId: this.session.source?.moduleId ?? null,
      sectionId: targetSection.id,
      pageId: hierarchy.page?.id ?? null,
      targetSectionId: targetSection.id,
      targetPageId: hierarchy.page?.id ?? null,
      device: builderQuery.getDevice(),
      canvas: { pages: builderQuery.getCanvasHierarchy().page ? [builderQuery.getCanvasHierarchy().page!] : [] },
      metadata: {},
    };
    const constraint = constraintEngine.evaluate("max-children", ctx);
    return { elementId: null, sectionId: targetSection.id, dropZone: "inside", valid: constraint.valid, reason: constraint.valid ? null : constraint.message };
  }

  diagnostics(): DragDiagnostics {
    return {
      totalSessions: this.totalSessions,
      activeSessions: this.active ? 1 : 0,
      completedSessions: this.completedSessions,
      cancelledSessions: this.cancelledSessions,
      avgDurationMs: this.totalSessions > 0 ? Math.round(this.totalDuration / this.totalSessions) : 0,
      avgDistance: this.totalSessions > 0 ? Math.round(this.totalDistance / this.totalSessions) : 0,
    };
  }
}

export const dragController = new DragController();
