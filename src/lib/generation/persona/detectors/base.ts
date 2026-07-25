import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { CreatorPersona } from "../types";

export interface PersonaDetector {
  niche: string;
  getPersona(): CreatorPersona;
  match(graph: KnowledgeGraph): number;
}

export function createDetector(
  niche: string,
  persona: CreatorPersona,
  matchFn: (graph: KnowledgeGraph) => number,
): PersonaDetector {
  return { niche, getPersona: () => persona, match: matchFn };
}
