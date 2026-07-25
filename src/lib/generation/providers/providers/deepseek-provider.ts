import type { AIProvider, AIPrompt, AIOptions, AIResponse } from "@/lib/generation/contracts";
import type { Result } from "@/lib/generation/domain";
import { success, failure } from "../../infrastructure/helpers/result";

export class DeepSeekProvider implements AIProvider {
  readonly name = "deepseek";
  readonly supportsStreaming = true;
  readonly supportsJsonMode = true;

  constructor(private config: { apiKey?: string; model?: string; baseUrl?: string } = {}) {}

  private get model(): string {
    return this.config.model ?? "deepseek-chat";
  }

  async generate(prompt: AIPrompt, options?: AIOptions): Promise<Result<AIResponse>> {
    if (!this.config.apiKey) {
      return failure(new Error("DeepSeek API key not configured"));
    }

    const start = Date.now();
    try {
      const response = await fetch(this.config.baseUrl ?? "https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: options?.model ?? this.model,
          messages: [
            { role: "system", content: prompt.system },
            ...prompt.messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          max_tokens: options?.maxTokens ?? 2048,
          temperature: options?.temperature ?? 0.7,
          response_format: prompt.responseFormat === "json_object" ? { type: "json_object" } : undefined,
        }),
        signal: AbortSignal.timeout(options?.maxTokens ? 60000 : 30000),
      });

      if (!response.ok) {
        return failure(new Error(`DeepSeek API error: ${response.status} ${response.statusText}`));
      }

      const data = await response.json();
      const latencyMs = Date.now() - start;
      const content = data.choices?.[0]?.message?.content ?? "";

      return success({
        content,
        model: this.model,
        latencyMs,
        tokenUsage: {
          prompt: data.usage?.prompt_tokens ?? 0,
          completion: data.usage?.completion_tokens ?? 0,
          total: data.usage?.total_tokens ?? 0,
        },
        cost: this.calculateCost(data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0),
        cached: false,
      });
    } catch (err) {
      return failure(new Error(`DeepSeek request failed: ${err instanceof Error ? err.message : String(err)}`));
    }
  }

  estimateCost(prompt: AIPrompt): number {
    const inputTokens = Math.ceil(prompt.system.length / 4) +
      prompt.messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
    return (inputTokens * 0.00000014) + (500 * 0.00000028);
  }

  async health() {
    const start = Date.now();
    try {
      const response = await fetch(`${this.config.baseUrl ?? "https://api.deepseek.com"}/v1/models`, {
        signal: AbortSignal.timeout(5000),
      });
      const ok = response.ok;
      return success({ ok, latencyMs: Date.now() - start });
    } catch {
      return success({ ok: false, latencyMs: Date.now() - start });
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens * 0.00000014) + (outputTokens * 0.00000028);
  }
}
