export interface SnapPoint {
  x: number;
  y: number;
  type: "edge" | "center" | "grid" | "spacing";
  strength: number;
}

export interface SnapGuide {
  orientation: "horizontal" | "vertical";
  position: number;
  sourceType: string;
  strength: number;
  distance: number;
}

export interface SnapResult {
  position: { x: number; y: number };
  snapped: boolean;
  x: number;
  y: number;
  type: "edge" | "center" | "grid" | "spacing" | null;
  guides: SnapGuide[];
  strength: number;
  distance: number;
  details: {
    snappedX: boolean;
    snappedY: boolean;
    candidatesChecked: number;
    durationMs: number;
  };
}

export interface SnapConfig {
  enabled: boolean;
  threshold: number;
  gridSize: number;
  snapToEdges: boolean;
  snapToCenters: boolean;
  snapToGrid: boolean;
}

const DEFAULT_SNAP_CONFIG: SnapConfig = {
  enabled: true, threshold: 5, gridSize: 20,
  snapToEdges: true, snapToCenters: true, snapToGrid: true,
};

interface Rect { x: number; y: number; width: number; height: number; }

export class SnapEngine {
  private config: SnapConfig;
  private cachedCandidates: Rect[] = [];
  private cachedResult: SnapResult | null = null;
  private lastCandidateHash = "";

  constructor(config: Partial<SnapConfig> = {}) {
    this.config = { ...DEFAULT_SNAP_CONFIG, ...config };
  }

  snap(rect: Rect, candidates: Rect[]): SnapResult {
    const start = performance.now();
    if (!this.config.enabled || candidates.length === 0) {
      const fast = { position: { x: rect.x, y: rect.y }, snapped: false, x: rect.x, y: rect.y, type: null as null, guides: [], strength: 0, distance: 0, details: { snappedX: false, snappedY: false, candidatesChecked: 0, durationMs: 0 } };
      return fast;
    }

    const hash = JSON.stringify(candidates);
    if (hash === this.lastCandidateHash && this.cachedResult && Math.abs(rect.x - this.cachedResult.x) < 1 && Math.abs(rect.y - this.cachedResult.y) < 1) {
      return this.cachedResult;
    }
    this.lastCandidateHash = hash;

    let bestX = rect.x;
    let bestY = rect.y;
    let snappedX = false;
    let snappedY = false;
    let snapType: SnapResult["type"] = null;
    let maxStrength = 0;
    let minDistance = Infinity;
    const guides: SnapGuide[] = [];
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    const right = rect.x + rect.width;
    const bottom = rect.y + rect.height;

    for (const candidate of candidates) {
      const cCenterX = candidate.x + candidate.width / 2;
      const cCenterY = candidate.y + candidate.height / 2;
      const cRight = candidate.x + candidate.width;
      const cBottom = candidate.y + candidate.height;

      if (this.config.snapToEdges) {
        const vPairs: Array<{ pos: number; cand: number; st: string; strength: number }> = [
          { pos: rect.x, cand: candidate.x, st: "left-left", strength: 0.8 },
          { pos: rect.x, cand: cRight, st: "left-right", strength: 0.6 },
          { pos: right, cand: candidate.x, st: "right-left", strength: 0.6 },
          { pos: right, cand: cRight, st: "right-right", strength: 0.8 },
        ];
        for (const p of vPairs) {
          const dist = Math.abs(p.pos - p.cand);
          if (dist < this.config.threshold) {
            const s = 1 - dist / this.config.threshold;
            if (s > maxStrength) { maxStrength = s; snapType = "edge"; }
            if (dist < minDistance) minDistance = dist;
            bestX = rect.x + (p.cand - p.pos);
            snappedX = true;
            guides.push({ orientation: "vertical", position: p.cand, sourceType: p.st, strength: Math.round(s * 100) / 100, distance: Math.round(dist * 10) / 10 });
          }
        }

        const hPairs: Array<{ pos: number; cand: number; st: string; strength: number }> = [
          { pos: rect.y, cand: candidate.y, st: "top-top", strength: 0.8 },
          { pos: rect.y, cand: cBottom, st: "top-bottom", strength: 0.6 },
          { pos: bottom, cand: candidate.y, st: "bottom-top", strength: 0.6 },
          { pos: bottom, cand: cBottom, st: "bottom-bottom", strength: 0.8 },
        ];
        for (const p of hPairs) {
          const dist = Math.abs(p.pos - p.cand);
          if (dist < this.config.threshold) {
            const s = 1 - dist / this.config.threshold;
            if (s > maxStrength) { maxStrength = s; snapType = "edge"; }
            if (dist < minDistance) minDistance = dist;
            bestY = rect.y + (p.cand - p.pos);
            snappedY = true;
            guides.push({ orientation: "horizontal", position: p.cand, sourceType: p.st, strength: Math.round(s * 100) / 100, distance: Math.round(dist * 10) / 10 });
          }
        }
      }

      if (this.config.snapToCenters) {
        const dx = Math.abs(centerX - cCenterX);
        const dy = Math.abs(centerY - cCenterY);
        if (dx < this.config.threshold) {
          const s = 1 - dx / this.config.threshold;
          if (s > maxStrength) { maxStrength = s; snapType = "center"; }
          bestX = cCenterX - rect.width / 2;
          snappedX = true;
          guides.push({ orientation: "vertical", position: cCenterX, sourceType: "center-x", strength: Math.round(s * 100) / 100, distance: Math.round(dx * 10) / 10 });
        }
        if (dy < this.config.threshold) {
          const s = 1 - dy / this.config.threshold;
          if (s > maxStrength) { maxStrength = s; snapType = "center"; }
          bestY = cCenterY - rect.height / 2;
          snappedY = true;
          guides.push({ orientation: "horizontal", position: cCenterY, sourceType: "center-y", strength: Math.round(s * 100) / 100, distance: Math.round(dy * 10) / 10 });
        }
      }
    }

    if (this.config.snapToGrid) {
      const gx = Math.round(rect.x / this.config.gridSize) * this.config.gridSize;
      const gy = Math.round(rect.y / this.config.gridSize) * this.config.gridSize;
      const dx = Math.abs(rect.x - gx);
      const dy = Math.abs(rect.y - gy);
      if (dx < this.config.threshold) {
        const s = 1 - dx / this.config.threshold;
        if (s > maxStrength) { maxStrength = s; snapType = "grid"; }
        bestX = gx; snappedX = true;
        guides.push({ orientation: "vertical", position: gx, sourceType: "grid-x", strength: Math.round(s * 100) / 100, distance: Math.round(dx * 10) / 10 });
      }
      if (dy < this.config.threshold) {
        const s = 1 - dy / this.config.threshold;
        if (s > maxStrength) { maxStrength = s; snapType = "grid"; }
        bestY = gy; snappedY = true;
        guides.push({ orientation: "horizontal", position: gy, sourceType: "grid-y", strength: Math.round(s * 100) / 100, distance: Math.round(dy * 10) / 10 });
      }
    }

    const snapped = snappedX || snappedY;
    const result: SnapResult = {
      position: { x: bestX, y: bestY },
      snapped, x: bestX, y: bestY, type: snapType,
      guides: guides.sort((a, b) => b.strength - a.strength),
      strength: Math.round(maxStrength * 100) / 100,
      distance: minDistance === Infinity ? 0 : Math.round(minDistance * 10) / 10,
      details: { snappedX, snappedY, candidatesChecked: candidates.length, durationMs: Math.round((performance.now() - start) * 100) / 100 },
    };

    this.cachedResult = result;
    return result;
  }

  setConfig(config: Partial<SnapConfig>): void { this.config = { ...this.config, ...config }; this.cachedResult = null; }
  getConfig(): SnapConfig { return { ...this.config }; }
  invalidateCache(): void { this.cachedResult = null; this.lastCandidateHash = ""; }
}

export const snapEngine = new SnapEngine();
