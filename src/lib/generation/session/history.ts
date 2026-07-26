import { sessionRegistry } from "./registry";
import type { HistoryEvent, HistoryEventType } from "./types";
import type { GenerationSessionData } from "./types";

export interface SessionTimeline {
  sessionId: string;
  creatorName: string;
  status: string;
  events: HistoryEvent[];
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
}

export const sessionHistory = {
  async record(
    sessionId: string,
    type: HistoryEventType,
    data: Record<string, unknown> = {},
  ): Promise<HistoryEvent> {
    return sessionRegistry.addHistoryEvent(sessionId, type, data);
  },

  async getTimeline(sessionId: string): Promise<SessionTimeline | null> {
    const session = await sessionRegistry.findById(sessionId);
    if (!session) return null;

    return {
      sessionId: session.id,
      creatorName: session.creatorName,
      status: session.status,
      events: session.history,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      duration: session.duration,
    };
  },

  async getTimelineByWorkspace(workspaceId: string): Promise<SessionTimeline[]> {
    const sessions = await sessionRegistry.findByWorkspace(workspaceId);
    return sessions.map((s: GenerationSessionData) => ({
      sessionId: s.id,
      creatorName: s.creatorName,
      status: s.status,
      events: s.history,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      duration: s.duration,
    }));
  },
};
