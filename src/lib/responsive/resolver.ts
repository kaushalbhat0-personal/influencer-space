export type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_ORDER: Viewport[] = ["mobile", "tablet", "desktop"];

/**
 * Resolves responsive block config to effective props for a given viewport.
 * Desktop is the base. Tablet overrides desktop. Mobile overrides tablet.
 * The renderer receives only resolved values — no responsive awareness needed.
 */
export class ResponsiveResolver {
  /**
   * Get the effective value of a single property for a given viewport.
   * Returns the viewport-specific value or falls back through the chain.
   */
  resolveValue(config: Record<string, unknown>, key: string, viewport: Viewport): unknown {
    const raw = config[key];

    // Not a responsive object — return as-is
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return raw;
    }

    const obj = raw as Record<string, unknown>;

    // Check if this looks like a responsive object (has viewport keys)
    const hasViewportKey = VIEWPORT_ORDER.some((v) => v in obj);
    if (!hasViewportKey) {
      return raw; // Plain object value, not responsive
    }

    // Walk the fallback chain from current viewport down to desktop
    const viewportIdx = VIEWPORT_ORDER.indexOf(viewport);
    for (let i = viewportIdx; i >= 0; i--) {
      const v = VIEWPORT_ORDER[i]!;
      if (v in obj && obj[v] !== null && obj[v] !== undefined) {
        return obj[v];
      }
    }

    return undefined;
  }

  /**
   * Resolve all config values for a given viewport.
   * Returns a flat props object — the renderer receives this.
   */
  resolve(config: Record<string, unknown>, viewport: Viewport): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(config)) {
      result[key] = this.resolveValue(config, key, viewport);
    }
    return result;
  }

  /**
   * Set a responsive value for a specific viewport.
   */
  setValue(config: Record<string, unknown>, key: string, value: unknown, viewport: Viewport): Record<string, unknown> {
    const raw = config[key];
    const existing = (typeof raw === "object" && raw !== null && !Array.isArray(raw))
      ? (raw as Record<string, unknown>)
      : {};

    // If the existing value is NOT a responsive object (e.g., plain string),
    // convert it to responsive format with the current value as desktop
    const hasViewportKey = VIEWPORT_ORDER.some((v) => v in existing);
    const existingDesktop = (existing as Record<string, unknown>).desktop ?? existing;
    const respObj: Record<string, unknown> = hasViewportKey
      ? { ...existing }
      : { desktop: existingDesktop, ...existing };

    respObj[viewport] = value;

    return { ...config, [key]: respObj };
  }
}

export const responsiveResolver = new ResponsiveResolver();
