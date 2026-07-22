import type { CreatorProfile, CreatorIntelligence } from "@/lib/creators/types";
import type { z } from "zod";

export interface GeneratorInput {
  profile: CreatorProfile;
  intelligence: CreatorIntelligence;
  existing?: Record<string, unknown>;
}

export interface GeneratorProvenance {
  generator: string;
  promptVersion: string;
  generatedAt: string;
  cached: boolean;
  latencyMs: number;
}

export interface GeneratorResult {
  content: Record<string, unknown>;
  componentIds: string[];
  cached: boolean;
  latencyMs: number;
  /** Provenance metadata — does not affect rendering */
  provenance?: GeneratorProvenance;
}

export interface ContentGenerator {
  readonly id: string;
  readonly description: string;
  readonly schema: z.ZodTypeAny;
  readonly componentIds: string[];
  /** Generators that must run before this one. Empty array = no dependencies. */
  readonly dependsOn: string[];
  generate(input: GeneratorInput): Promise<GeneratorResult>;
}
