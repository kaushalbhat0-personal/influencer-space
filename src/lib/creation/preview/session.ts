import type { GeneratedPage, GeneratedNavItem } from "../types";

export interface PreviewSession {
  id: string;
  blueprintId: string;
  themeId: string;
  themeVariant: "light" | "dark";
  pages: GeneratedPage[];
  navigation: GeneratedNavItem[];
  createdAt: Date;
}

let sessionCounter = 0;

export class PreviewSessionManager {
  private sessions = new Map<string, PreviewSession>();

  create(
    blueprintId: string,
    themeId: string,
    themeVariant: "light" | "dark",
    pages: GeneratedPage[],
    navigation: GeneratedNavItem[],
  ): PreviewSession {
    sessionCounter++;
    const session: PreviewSession = {
      id: `preview_${Date.now()}_${sessionCounter}`,
      blueprintId,
      themeId,
      themeVariant,
      pages,
      navigation,
      createdAt: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(sessionId: string): PreviewSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  switchTheme(sessionId: string, newThemeId: string): PreviewSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    session.themeId = newThemeId;
    return session;
  }

  switchVariant(sessionId: string, variant: "light" | "dark"): PreviewSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    session.themeVariant = variant;
    return session;
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  cleanup(maxAgeMs: number = 30 * 60 * 1000): number {
    const now = Date.now();
    let count = 0;
    const entries = Array.from(this.sessions.entries());
    for (const [id, session] of entries) {
      if (now - session.createdAt.getTime() > maxAgeMs) {
        this.sessions.delete(id);
        count++;
      }
    }
    return count;
  }
}

export const previewSessionManager = new PreviewSessionManager();
