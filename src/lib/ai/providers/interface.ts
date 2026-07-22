/** Standardized LLM chat message */
export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Standardized LLM response */
export interface LlmResponse {
  content: string;
  model: string;
  latencyMs: number;
  tokenUsage: { prompt: number; completion: number; total: number } | null;
}

/** Configuration for an LLM provider */
export interface LlmConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Abstract LLM provider.
 * Every provider (OpenAI, Gemini, Anthropic, Local) implements this.
 * The Intelligence Engine never depends on a specific provider.
 */
export interface LlmProvider {
  readonly name: string;
  readonly config: LlmConfig;
  execute(messages: LlmMessage[], config?: Partial<LlmConfig>): Promise<LlmResponse>;
}
