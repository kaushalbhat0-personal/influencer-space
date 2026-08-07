// ── Knowledge Score Service ─────────────────────────────────
// Orchestrates the full runtime: build snapshot → score → missing fields →
// questions → hints → storefront score. Persists declared facts and the last
// score to Setting rows. All computations are deterministic — the runtime
// itself never invokes AI.

import { SettingsService } from "@/services/settings.service";
import { knowledgeAggregateSource } from "../infrastructure/aggregate-source";
import { computeKnowledgeScore } from "./score-engine";
import { computeStorefrontScore } from "./storefront-score";
import { generateCompletionQuestions } from "./question-engine";
import { generateBuilderHints } from "./builder-hints";
import { applyDeclaredAnswers, type AnswerError } from "./completion-engine";
import { getPack } from "../domain/category-packs";
import type { CategoryPack, KnowledgeScore, KnowledgeSnapshot, StorefrontScore } from "../domain/types";

export interface KnowledgeRuntimeResult {
  score: KnowledgeScore;
  storefrontScore: StorefrontScore;
  questions: ReturnType<typeof generateCompletionQuestions>;
  hints: ReturnType<typeof generateBuilderHints>;
  pack: CategoryPack;
  completeness: {
    complete: number;
    total: number;
  };
}

export interface SaveAnswersResult {
  errors: AnswerError[];
  result?: KnowledgeRuntimeResult;
}

const SCORE_SETTING_KEY = "knowledge_score";

function completenessOf(score: KnowledgeScore): { complete: number; total: number } {
  const total = score.categories.reduce((sum, c) => sum + c.totalCount, 0);
  const complete = score.categories.reduce((sum, c) => sum + c.completeCount, 0);
  return { complete, total };
}

export class KnowledgeScoreService {
  /** Full runtime evaluation — deterministic, no side effects. */
  evaluate(tenantId: string): Promise<KnowledgeRuntimeResult> {
    return this.evaluateForSnapshot(tenantId, knowledgeAggregateSource.buildSnapshot(tenantId));
  }

  private async evaluateForSnapshot(
    tenantId: string,
    snapshotPromise: Promise<KnowledgeSnapshot>,
  ): Promise<KnowledgeRuntimeResult> {
    const snapshot = await snapshotPromise;
    const score = computeKnowledgeScore(snapshot);
    const storefrontScore = computeStorefrontScore(snapshot, score.overall);
    return {
      score,
      storefrontScore,
      questions: generateCompletionQuestions(snapshot, score.missingFields),
      hints: generateBuilderHints(snapshot),
      pack: getPack(snapshot.entityType),
      completeness: completenessOf(score),
    };
  }

  /** Persist the last computed score (read by diagnostics / super-admin). */
  async persistScore(tenantId: string, result: KnowledgeRuntimeResult): Promise<void> {
    await SettingsService.upsertSetting(tenantId, SCORE_SETTING_KEY, {
      score: result.score,
      storefrontScore: result.storefrontScore,
      packId: result.pack.id,
      completeness: result.completeness,
      updatedAt: new Date().toISOString(),
    } as never);
  }

  async loadPersistedScore(tenantId: string): Promise<{
    score: KnowledgeScore;
    storefrontScore: StorefrontScore;
    packId: string;
    updatedAt: string;
  } | null> {
    const value = await SettingsService.getSettingByKey(tenantId, SCORE_SETTING_KEY);
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (record.score) {
        return {
          score: record.score as KnowledgeScore,
          storefrontScore: record.storefrontScore as StorefrontScore,
          packId: (record.packId as string) ?? "creator",
          updatedAt: (record.updatedAt as string) ?? "",
        };
      }
    }
    return null;
  }

  /**
   * Save creator-confirmed answers. Only declared facts are written; content
   * fields reject inline answers (their completion happens on their own admin
   * pages). On success the facts are persisted and the runtime re-evaluated.
   */
  async saveAnswers(tenantId: string, answers: Array<{ fieldId: string; value: unknown }>): Promise<SaveAnswersResult> {
    if (answers.length === 0) return { errors: [{ fieldId: "", message: "No answers provided." }] };

    const snapshot = await knowledgeAggregateSource.buildSnapshot(tenantId);
    const applied = applyDeclaredAnswers(snapshot, answers);
    if (applied.errors.length > 0) return { errors: applied.errors };

    const mergedFacts = { ...snapshot.declared, ...applied.facts };
    await SettingsService.upsertSetting(tenantId, "knowledge_completion", {
      packId: snapshot.entityType,
      updatedAt: new Date().toISOString(),
      facts: mergedFacts,
    } as never);

    const result = await this.evaluateForSnapshot(
      tenantId,
      Promise.resolve(applied.updatedSnapshot),
    );
    await this.persistScore(tenantId, result);
    return { errors: [], result };
  }
}

export const knowledgeScoreService = new KnowledgeScoreService();
