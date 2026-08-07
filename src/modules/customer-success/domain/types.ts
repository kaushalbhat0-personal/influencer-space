// ── Customer Success — Domain Types ─────────────────────────
// RCCF-EPIC-09. Read-only derivation runtime: it answers "who needs help right
// now" by reading existing runtimes. It creates no new business data.

export type JourneyStage =
  | "signed_up"
  | "imported"
  | "generated"
  | "builder_started"
  | "published"
  | "payment_ready"
  | "first_product"
  | "first_sale"
  | "returning_seller"
  | "growing_business";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type OpportunityType =
  | "upgrade_growth"
  | "upgrade_scale"
  | "agency"
  | "addons"
  | "high_selling_potential"
  | "commerce_expansion"
  | "seo_opportunity";

export interface SuccessSignals {
  tenantId: string;
  createdAt: Date;
  lastActivityAt: Date | null;
  productCount: number;
  orderCount: number;
  galleryCount: number;
  published: boolean;
  healthScore: number | null;
  knowledgeScore: number | null;
  goalAlignment: number | null;
  successCompletion: number | null;
  completedRecommendations: number;
  paymentReady: boolean;
  paymentIncomplete: boolean;
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
  hasProducts: boolean;
  hasOrders: boolean;
  analyticsActive: boolean;
  seoConfigured: boolean;
  planCode: string | null;
  commerceStrategy: string;
}

export interface SuccessDimensions {
  activation: number;
  profile: number;
  website: number;
  publishing: number;
  payment: number;
  commerce: number;
  engagement: number;
  retention: number;
  return: number;
}

export interface SuccessOpportunity {
  type: OpportunityType;
  label: string;
  description: string;
  value: number;
  href?: string;
}

export interface RiskFinding {
  key: string;
  label: string;
  severity: RiskLevel;
  description: string;
}

export interface JourneyMilestone {
  stage: JourneyStage;
  label: string;
  reached: boolean;
  estimatedDays: number | null;
}

export interface CustomerSuccess {
  tenantId: string;
  score: number;
  dimensions: SuccessDimensions;
  stage: JourneyStage;
  stageLabel: string;
  milestones: JourneyMilestone[];
  nextMilestone: { stage: JourneyStage; label: string; estimatedDays: number | null } | null;
  risk: RiskLevel;
  riskFindings: RiskFinding[];
  opportunities: SuccessOpportunity[];
  completionPercent: number;
  estimatedTimeToNext: number | null;
  trialEndsAt: Date | null;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  label: string;
  timestamp: string;
  icon?: string;
}
