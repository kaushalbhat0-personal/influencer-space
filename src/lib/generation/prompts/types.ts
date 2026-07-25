export type PromptVariableType = "string" | "number" | "boolean" | "string[]";

export interface PromptVariable {
  name: string;
  type: PromptVariableType;
  required: boolean;
  description: string;
  defaultValue?: unknown;
}

export interface PromptTemplate {
  id: string;
  stage: string;
  niche?: string;
  version: string;
  parentId?: string;
  system: string;
  template: string;
  variables: PromptVariable[];
  responseFormat?: "text" | "json_object";
  maxTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
}

export type PromptVariables = Record<string, unknown>;

export interface PromptContext {
  stage: string;
  niche: string;
  strategyType: string;
  variables: PromptVariables;
  creatorName?: string;
  locale?: string;
}

export interface RenderedPrompt {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  responseFormat?: "text" | "json_object";
  maxTokens?: number;
  temperature?: number;
  templateId: string;
  version: string;
  renderTimeMs: number;
}

export interface PromptInheritanceChain {
  template: PromptTemplate;
  ancestors: PromptTemplate[];
  resolved: PromptTemplate;
}

export interface PromptMetrics {
  usageCount: number;
  cacheHits: number;
  totalRenderTimeMs: number;
  lastUsed: string | null;
}
