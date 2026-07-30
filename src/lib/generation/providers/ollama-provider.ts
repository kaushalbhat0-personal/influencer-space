import type { AIProvider, AIPrompt, AIOptions, AIResponse } from "@/lib/generation/contracts";
import type { Result } from "@/lib/generation/domain";
import { success, failure } from "../infrastructure/helpers/result";

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  readonly supportsStreaming = true;
  readonly supportsJsonMode = false;

  constructor(private config: { baseUrl?: string; model?: string } = {}) {}

  private get model(): string {
    return this.config.model ?? "llama3";
  }

  async generate(prompt: AIPrompt, options?: AIOptions): Promise<Result<AIResponse>> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.config.baseUrl ?? "http://localhost:11434"}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: options?.model ?? this.model,
          messages: [
            { role: "system", content: prompt.system },
            ...prompt.messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          options: {
            num_predict: options?.maxTokens ?? 2048,
            temperature: options?.temperature ?? 0.7,
          },
          stream: false,
        }),
        signal: AbortSignal.timeout(120000),
      });

      if (!response.ok) {
        return failure(new Error(`Ollama API error: ${response.status}`));
      }

      const data = await response.json();
      const latencyMs = Date.now() - start;
      const content = data.message?.content ?? "";

      return success({
        content,
        model: this.model,
        latencyMs,
        tokenUsage: {
          prompt: 0,
          completion: 0,
          total: 0,
        },
        cost: 0,
        cached: false,
      });
    } catch (err) {
      return failure(new Error(`Ollama request failed: ${err instanceof Error ? err.message : String(err)}`));
    }
  }

  estimateCost(): number {
    return 0;
  }

  async health() {
    const start = Date.now();
    try {
      const response = await fetch(`${this.config.baseUrl ?? "http://localhost:11434"}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      return success({ ok: response.ok, latencyMs: Date.now() - start });
    } catch {
      return success({ ok: false, latencyMs: Date.now() - start });
    }
  }
}
