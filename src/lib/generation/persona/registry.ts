import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { PersonaDetector } from "./detectors/base";
import type { CreatorPersona } from "./types";

export interface PersonaMatchResult {
  persona: CreatorPersona;
  score: number;
}

export class PersonaRegistry {
  private detectors: PersonaDetector[] = [];

  register(detector: PersonaDetector): void {
    if (this.detectors.some((d) => d.getPersona().id === detector.getPersona().id)) {
      throw new Error(`Persona detector already registered: ${detector.getPersona().id}`);
    }
    this.detectors.push(detector);
  }

  getDetectorsForNiche(niche: string): PersonaDetector[] {
    return this.detectors.filter((d) => d.niche === niche);
  }

  detect(graph: KnowledgeGraph): PersonaMatchResult {
    const niche = graph.creator.niche || "default";
    const candidates = this.getDetectorsForNiche(niche);

    if (candidates.length === 0) {
      const fallback = this.detectors.find((d) => d.getPersona().id === "default_creator")!;
      return { persona: fallback.getPersona(), score: 10 };
    }

    let best = candidates[0]!;
    let bestScore = -1;

    for (const d of candidates) {
      const score = d.match(graph);
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }

    return { persona: best.getPersona(), score: Math.max(bestScore, 1) };
  }

  getAll(): PersonaDetector[] {
    return [...this.detectors];
  }

  listNiches(): string[] {
    return Array.from(new Set(this.detectors.map((d) => d.niche)));
  }
}
