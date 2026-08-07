// ── Knowledge Completion Runtime (RCCF-EPIC-04) ─────────────
// Measures knowledge quality, reports only what is missing, and guides
// creators toward a complete business profile — registry-driven, deterministic
// and AI-cost-neutral.

// Domain
export {
  KNOWLEDGE_CATEGORY_LABELS,
  type KnowledgeCategory,
  type KnowledgeField,
  type KnowledgeSnapshot,
  type MissingField,
  type KnowledgeScore,
  type CategoryScore,
  type CompletionQuestion,
  type CompletionAnswer,
  type QuestionType,
  type CategoryPack,
  type PackQuestion,
  type StorefrontScore,
  type StorefrontDimension,
  type BuilderHint,
  type BuilderHintSeverity,
  type FieldSource,
  type FieldValidation,
  type KnowledgeCompletionRecord,
} from "./domain/types";

export {
  KNOWLEDGE_REGISTRY,
  getField,
  getFieldByDeclaredKey,
  declaredKeyFor,
} from "./domain/registry";

export {
  CATEGORY_PACKS,
  PACK_FIELDS,
  DEFAULT_PACK_ID,
  resolvePack,
  getPack,
  applicableFieldsForPack,
  applicableForSnapshot,
  ALL_FIELDS,
} from "./domain/category-packs";

export {
  ALLOWED_ASSIST_OPERATIONS,
  PROHIBITED_ASSIST_OPERATIONS,
  FACT_ONLY_FIELDS,
  resolveAssist,
  type AssistOperation,
  type AssistRequest,
  type AssistDecision,
  type ProhibitedOperation,
} from "./domain/ai-contract";

// Application
export {
  computeKnowledgeScore,
  scoreLabel,
  confidenceLabel,
  priorityWeight,
  KNOWLEDGE_CATEGORY_ORDER,
} from "./application/score-engine";

export {
  detectMissingFields,
  detectCompleteFields,
} from "./application/analyzer";

export {
  generateCompletionQuestions,
  MAX_COMPLETION_QUESTIONS,
} from "./application/question-engine";

export {
  validateAnswer,
  applyDeclaredAnswers,
  mergeDeclared,
  type ApplyAnswersResult,
  type AnswerError,
  type ValidateAnswerResult,
} from "./application/completion-engine";

export { computeStorefrontScore, STOREFRONT_DIMENSION_ORDER } from "./application/storefront-score";
export { generateBuilderHints, filterHintsForVisibleModules, missingFieldSummary } from "./application/builder-hints";
export {
  knowledgeScoreService,
  type KnowledgeRuntimeResult,
  type SaveAnswersResult,
} from "./application/score-service";

// Infrastructure
export { knowledgeAggregateSource, KnowledgeAggregateSource } from "./infrastructure/aggregate-source";
