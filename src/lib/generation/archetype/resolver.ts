/**
 * Archetype Resolver — RCCF-PRELAUNCH-12B
 * Pure, config-driven, deterministic, no LLM, no giant if/else.
 */
import type { ArchetypeInput, ArchetypeResult, ArchetypeEvidence } from "./types";
import type { Archetype } from "./types";
import { ARCHETYPE_RULES, FALLBACK_ARCHETYPE, ARCHEYPE_CONFIDENCE_THRESHOLD } from "./config";

export class ArchetypeResolver {
  resolve(input: ArchetypeInput): ArchetypeResult {
    const scores: Record<Archetype, number> = {
      professional_resume: 0,
      creator: 0,
      local_business: 0,
    };
    const evidence: ArchetypeEvidence[] = [];

    for (const rule of ARCHETYPE_RULES) {
      const raw = rule.check(input);
      const strength = typeof raw === "boolean" ? (raw ? 1 : 0) : Math.max(0, Math.min(1, raw));
      if (strength <= 0) continue;
      for (const [arch, weight] of Object.entries(rule.weights)) {
        const a = arch as Archetype;
        const contrib = weight * strength;
        scores[a] += contrib;
        evidence.push({
          signal: rule.signal,
          value: strength,
          weight: contrib,
          archetype: a,
        });
      }
    }

    // Determine best
    let best: Archetype = FALLBACK_ARCHETYPE;
    let bestScore = scores[FALLBACK_ARCHETYPE] ?? 0;
    for (const arch of Object.keys(scores) as Archetype[]) {
      if (scores[arch] > bestScore) {
        bestScore = scores[arch];
        best = arch;
      }
    }

    // Confidence: normalized by plausible max (~12 for professional)
    // Compute max possible if all rules for that archetype fired fully
    const maxScores: Record<Archetype, number> = {
      professional_resume: 0,
      creator: 0,
      local_business: 0,
    };
    for (const rule of ARCHETYPE_RULES) {
      for (const [arch, w] of Object.entries(rule.weights)) {
        maxScores[arch as Archetype] += w;
      }
    }
    const maxForBest = maxScores[best] || 1;
    let confidence = Math.min(1, bestScore / (maxForBest * 0.6)); // 0.6 dampener to reach higher confidence sooner

    // If below threshold, fallback to creator (safe)
    let finalArchetype = best;
    let reasoning = `Best archetype ${best} with score ${bestScore.toFixed(2)} (max ~${maxForBest})`;
    if (confidence < ARCHEYPE_CONFIDENCE_THRESHOLD) {
      reasoning += `; below threshold ${ARCHEYPE_CONFIDENCE_THRESHOLD} — fallback to ${FALLBACK_ARCHETYPE}`;
      finalArchetype = FALLBACK_ARCHETYPE;
      // Keep original best evidence but confidence stays low
      confidence = Math.min(confidence, 0.34);
    } else {
      reasoning += `; confidence ${confidence.toFixed(2)}`;
    }

    // Sort evidence by weight desc for diagnostics
    evidence.sort((a, b) => b.weight - a.weight);

    return {
      archetype: finalArchetype,
      confidence,
      evidence: evidence.slice(0, 20),
      scores,
      reasoning,
    };
  }
}

export const archetypeResolver = new ArchetypeResolver();
