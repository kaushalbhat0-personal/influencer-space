import type { CreatorProfile, CreatorIntelligence } from "@/lib/creators/types";
import type { z } from "zod";

export interface GeneratorInput {
  profile: CreatorProfile;
  intelligence: CreatorIntelligence;
  /** Optional existing content for merging/regeneration */
  existing?: Record<string, unknown>;
}

export interface GeneratorResult {
  /** The content produced by this generator */
  content: Record<string, unknown>;
  /** Which component IDs this content can populate */
  componentIds: string[];
  /** Whether this result came from cache */
  cached: boolean;
  /** Latency in milliseconds */
  latencyMs: number;
}

/**
 * A Content Generator produces structured content for one or more component types.
 * Each generator is independently registered and discoverable.
 */
export interface ContentGenerator {
  readonly id: string;
  readonly description: string;
  readonly schema: z.ZodTypeAny;
  readonly componentIds: string[];
  generate(input: GeneratorInput): Promise<GeneratorResult>;
}
