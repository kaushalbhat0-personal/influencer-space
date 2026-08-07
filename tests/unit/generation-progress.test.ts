import { describe, it, expect } from "vitest";
import { GENERATION_STAGES, JOURNEY_FRIENDLY } from "@/modules/generation-progress";
import { INTELLIGENCE_EVENT_TYPES } from "@/modules/event-runtime/domain/types";

describe("RCCF-LAUNCH-TRACK-03 — generation progress runtime", () => {
  it("maps every canonical stage to a friendly, creator-first message", () => {
    for (const stage of GENERATION_STAGES) {
      expect(JOURNEY_FRIENDLY[stage.id], stage.id).toBeDefined();
      // No technical jargon in the friendly copy.
      expect(JOURNEY_FRIENDLY[stage.id]!.toLowerCase()).not.toMatch(/runtime|provision|pipeline|intelligence|validation|import/i);
    }
    expect(GENERATION_STAGES.length).toBe(10);
  });

  it("friendly messages are complete and non-empty", () => {
    expect(JOURNEY_FRIENDLY["import_profile"]).toBe("Fetching your profile");
    expect(JOURNEY_FRIENDLY["knowledge_intelligence"]).toBe("Learning about your brand");
    expect(JOURNEY_FRIENDLY["publishing"]).toBe("Publishing your website");
  });

  it("declares the canonical generation events on the Event Runtime", () => {
    for (const type of ["generation.started", "generation.profile.imported", "generation.publish.completed", "generation.dashboard.ready", "generation.completed", "generation.failed"]) {
      expect(INTELLIGENCE_EVENT_TYPES).toContain(type);
    }
  });
});
