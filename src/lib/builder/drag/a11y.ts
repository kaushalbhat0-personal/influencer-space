let liveRegion: HTMLDivElement | null = null;
let announcedCount = 0;
let errors: string[] = [];

function getLiveRegion(): HTMLDivElement {
  if (!liveRegion || !document.body.contains(liveRegion)) {
    liveRegion = document.createElement("div");
    liveRegion.setAttribute("role", "status");
    liveRegion.setAttribute("aria-live", "assertive");
    liveRegion.setAttribute("aria-atomic", "true");
    liveRegion.className = "sr-only";
    liveRegion.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
    document.body.appendChild(liveRegion);
  }
  return liveRegion;
}

export interface A11yAnnouncement {
  type: "drag:started" | "drag:updated" | "drag:targetChanged" | "drag:cancelled" | "drag:completed" | "keyboard:pickup" | "keyboard:drop" | "keyboard:cancel";
  message: string;
  timestamp: number;
}

export interface A11yDiagnostics {
  totalAnnouncements: number;
  announcements: A11yAnnouncement[];
  missingAriaCount: number;
  focusIssues: string[];
  errors: string[];
  reducedMotionActive: boolean;
}

const announcements: A11yAnnouncement[] = [];

let keyboardDragMode = false;
let keyboardDragElement: string | null = null;

function announce(message: string, type: A11yAnnouncement["type"]): void {
  const region = getLiveRegion();
  region.textContent = "";
  void region.offsetWidth;
  region.textContent = message;
  announcedCount++;
  announcements.push({ type, message, timestamp: Date.now() });
  if (announcements.length > 100) announcements.shift();
}

export const DragA11y = {
  announceDragStarted(elementName: string): void {
    announce(`Picked up ${elementName}. Use arrow keys to move, Enter to drop, Escape to cancel.`, "drag:started");
  },

  announceDragUpdated(position: string): void {
    if (announcedCount % 5 === 0) announce(`Moved to ${position}.`, "drag:updated");
  },

  announceTargetChanged(targetName: string, valid: boolean): void {
    if (valid) announce(`Over ${targetName}.`, "drag:targetChanged");
    else announce(`Cannot drop on ${targetName}.`, "drag:targetChanged");
  },

  announceDragCancelled(elementName: string): void {
    announce(`${elementName} returned to original position.`, "drag:cancelled");
  },

  announceDragCompleted(elementName: string, targetName: string): void {
    announce(`${elementName} dropped into ${targetName}.`, "drag:completed");
  },

  announceKeyboardPickup(elementName: string): void {
    keyboardDragMode = true;
    keyboardDragElement = elementName;
    announce(`Keyboard drag mode active. Selected ${elementName}. Arrow keys to move, Enter to drop.`, "keyboard:pickup");
  },

  announceKeyboardDrop(elementName: string, targetName: string): void {
    keyboardDragMode = false;
    keyboardDragElement = null;
    announce(`${elementName} dropped into ${targetName}.`, "keyboard:drop");
  },

  announceKeyboardCancel(): void {
    keyboardDragMode = false;
    keyboardDragElement = null;
    announce("Drag cancelled.", "keyboard:cancel");
  },

  isKeyboardDragActive(): boolean { return keyboardDragMode; },
  getKeyboardDragElement(): string | null { return keyboardDragElement; },

  applyAriaToElement(element: HTMLElement, isDraggable: boolean): void {
    element.setAttribute("aria-grabbed", "false");
    if (isDraggable) {
      element.setAttribute("draggable", "true");
      element.setAttribute("role", "option");
    }
    element.setAttribute("aria-label", element.getAttribute("data-module") ?? "Canvas element");
  },

  applyAriaToContainer(container: HTMLElement): void {
    container.setAttribute("role", "listbox");
    container.setAttribute("aria-label", "Canvas modules");
  },

  isReducedMotion(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  },

  recordError(msg: string): void { errors.push(msg); },

  diagnostics(): A11yDiagnostics {
    let missingAria = 0;
    if (typeof document !== "undefined") {
      const draggables = document.querySelectorAll("[data-element-id]");
      for (const el of Array.from(draggables)) {
        if (!el.getAttribute("aria-grabbed")) missingAria++;
        if (!el.getAttribute("role")) missingAria++;
      }
    }
    return {
      totalAnnouncements: announcedCount,
      announcements: [...announcements],
      missingAriaCount: missingAria,
      focusIssues: [],
      errors: [...errors],
      reducedMotionActive: this.isReducedMotion(),
    };
  },

  reset(): void {
    announcements.length = 0;
    announcedCount = 0;
    errors = [];
    keyboardDragMode = false;
    keyboardDragElement = null;
    if (liveRegion?.parentElement) liveRegion.parentElement.removeChild(liveRegion);
    liveRegion = null;
  },
};
