import type { AIPrompt, AIOptions } from "@/lib/generation/contracts";

export interface ModelCapability {
  model: string;
  provider: string;
  supportsStreaming: boolean;
  supportsJsonMode: boolean;
  maxContextTokens: number;
  maxOutputTokens: number;
  costPerInputToken: number;
  costPerOutputToken: number;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
  rateLimitPerMinute?: number;
}

export interface ProviderStats {
  name: string;
  model: string;
  available: boolean;
  healthy: boolean;
  latencyMs: number;
  lastSuccess: number | null;
  lastFailure: number | null;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  failures: number;
  failureRate: number;
}

export const PROVIDER_PRIORITY: string[] = [
  "cache",
  "deepseek",
  "ollama",
  "google",
  "openai",
  "anthropic",
  "mock",
];

export const MODEL_CAPABILITIES: Record<string, ModelCapability> = {
  "deepseek-chat": { model: "deepseek-chat", provider: "deepseek", supportsStreaming: true, supportsJsonMode: true, maxContextTokens: 64000, maxOutputTokens: 8192, costPerInputToken: 0.00000014, costPerOutputToken: 0.00000028 },
  "gpt-4o": { model: "gpt-4o", provider: "openai", supportsStreaming: true, supportsJsonMode: true, maxContextTokens: 128000, maxOutputTokens: 4096, costPerInputToken: 0.0000025, costPerOutputToken: 0.00001 },
  "gpt-4o-mini": { model: "gpt-4o-mini", provider: "openai", supportsStreaming: true, supportsJsonMode: true, maxContextTokens: 128000, maxOutputTokens: 16384, costPerInputToken: 0.00000015, costPerOutputToken: 0.0000006 },
  "claude-3-5-sonnet": { model: "claude-3-5-sonnet", provider: "anthropic", supportsStreaming: true, supportsJsonMode: true, maxContextTokens: 200000, maxOutputTokens: 8192, costPerInputToken: 0.000003, costPerOutputToken: 0.000015 },
  "claude-3-haiku": { model: "claude-3-haiku", provider: "anthropic", supportsStreaming: true, supportsJsonMode: true, maxContextTokens: 200000, maxOutputTokens: 4096, costPerInputToken: 0.00000025, costPerOutputToken: 0.00000125 },
  "gemini-1.5-pro": { model: "gemini-1.5-pro", provider: "google", supportsStreaming: true, supportsJsonMode: true, maxContextTokens: 1000000, maxOutputTokens: 8192, costPerInputToken: 0.00000125, costPerOutputToken: 0.000005 },
  "gemini-1.5-flash": { model: "gemini-1.5-flash", provider: "google", supportsStreaming: true, supportsJsonMode: true, maxContextTokens: 1000000, maxOutputTokens: 8192, costPerInputToken: 0.000000075, costPerOutputToken: 0.0000003 },
  "ollama/llama3": { model: "ollama/llama3", provider: "ollama", supportsStreaming: true, supportsJsonMode: false, maxContextTokens: 8192, maxOutputTokens: 4096, costPerInputToken: 0, costPerOutputToken: 0 },
  "mock-model": { model: "mock-model", provider: "mock", supportsStreaming: false, supportsJsonMode: true, maxContextTokens: 4096, maxOutputTokens: 1024, costPerInputToken: 0, costPerOutputToken: 0 },
};

export function getModelCapability(model: string): ModelCapability | null {
  return MODEL_CAPABILITIES[model] ?? null;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function hashPrompt(prompt: AIPrompt, options?: AIOptions): string {
  const parts = [
    prompt.system,
    ...prompt.messages.map((m) => `${m.role}:${m.content}`),
    options?.model ?? "",
    String(options?.temperature ?? 0.7),
    prompt.responseFormat ?? "",
  ];
  let hash = 0;
  const str = parts.join("|");
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `ph_${Math.abs(hash).toString(16)}`;
}
