/**
 * Archetype Resolver types — RCCF-PRELAUNCH-12B
 * Pure, config-driven archetype determination.
 */

export type Archetype = "professional_resume" | "creator" | "local_business";

export interface ArchetypeEvidence {
  signal: string;
  value: string | number | boolean;
  weight: number;
  archetype: Archetype;
}

export interface ArchetypeResult {
  archetype: Archetype;
  confidence: number; // 0..1
  evidence: ArchetypeEvidence[];
  scores: Record<Archetype, number>;
  reasoning: string;
}

export interface ArchetypeInput {
  evidence: import("@/lib/generation/intelligence/evidence/types").EvidenceIntelligence;
  relationships: import("@/lib/generation/intelligence/evidence/relationship").RelationshipGraph;
  source: import("@/lib/generation/intelligence/types").ContentSource;
  acquisition?: {
    completeness: number;
    populatedFields: string[];
    missingFields: string[];
  };
  knowledgeGraph?: import("@/lib/generation/intelligence/types").KnowledgeGraph;
}
