export interface HeadingAudit {
  level: number;
  text: string;
  valid: boolean;
  issue?: string;
}

export function auditHeadingHierarchy(headings: Array<{ level: number; text: string }>): HeadingAudit[] {
  const results: HeadingAudit[] = [];
  let expectedLevel = 1;

  for (const h of headings) {
    if (h.level < 1 || h.level > 6) {
      results.push({ ...h, valid: false, issue: `Heading level ${h.level} is out of range (1-6)` });
      continue;
    }
    if (h.level > expectedLevel + 1) {
      results.push({ ...h, valid: false, issue: `Skipped heading level from ${expectedLevel} to ${h.level}` });
      expectedLevel = h.level;
    } else {
      expectedLevel = h.level;
      results.push({ ...h, valid: true });
    }
  }
  return results;
}

export function checkColorContrast(foreground: string, background: string): number {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg) return 0;

  const fgLuminance = relativeLuminance(fg);
  const bgLuminance = relativeLuminance(bg);
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsWcagAA(contrast: number, isLargeText: boolean): boolean {
  return isLargeText ? contrast >= 3 : contrast >= 4.5;
}

export function meetsWcagAAA(contrast: number, isLargeText: boolean): boolean {
  return isLargeText ? contrast >= 4.5 : contrast >= 7;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function supportsReducedMotion(): boolean {
  return typeof window !== "undefined" && "matchMedia" in window;
}

export function getSkipLinkMarkup(_id = "main-content"): string {
  return `Skip to main content`;
}

function parseColor(hex: string): [number, number, number] | null {
  const match = hex.replace("#", "").match(/^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (!match) return null;
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
