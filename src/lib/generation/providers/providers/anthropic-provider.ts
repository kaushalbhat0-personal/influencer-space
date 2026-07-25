import type { AIProvider, AIPrompt, AIOptions, AIResponse } from "@/lib/generation/contracts";
import type { Result } from "@/lib/generation/domain";
import { success, failure } from "../../infrastructure/helpers/result";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly supportsStreaming = true;
  readonly supportsJsonMode = true;

  constructor(private config: { apiKey?: string; model?: string; baseUrl?: string } = {}) {}

  private get model(): string {
    return this.config.model ?? "claude-3-haiku";
  }

  async generate(prompt: AIPrompt, options?: AIOptions): Promise<Result<AIResponse>> {
    if (!this.config.apiKey) {
      return failure(new Error("Anthropic API key not configured"));
    }

    const start = Date.now();
    try {
      const response = await fetch(this.config.baseUrl ?? "https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: options?.model ?? this.model,
          system: prompt.system,
          messages: prompt.messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: options?.maxTokens ?? 2048,
          temperature: options?.temperature ?? 0.7,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const body = await response.text();
        return failure(new Error(`Anthropic API error: ${response.status} - ${body}`));
      }

      const data = await response.json();
      const latencyMs = Date.now() - start;
      const content = data.content?.[0]?.text ?? "";

      return success({
        content,
        model: this.model,
        latencyMs,
        tokenUsage: {
          prompt: data.usage?.input_tokens ?? 0,
          completion: data.usage?.output_tokens ?? 0,
          total: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
        },
        cost: this.calculateCost(data.usage?.input_tokens ?? 0, data.usage?.output_tokens ?? 0),
        cached: false,
      });
    } catch (err) {
      return failure(new Error(`Anthropic request failed: ${err instanceof Error ? err.message : String(err)}`));
    }
  }

  estimateCost(prompt: AIPrompt): number {
    const inputTokens = Math.ceil(prompt.system.length / 4) +
      prompt.messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
    const isHaiku = this.model.includes("haiku");
    const inputRate = isHaiku ? 0.00000025 : 0.000003;
    const outputRate = isHaiku ? 0.00000125 : 0.000015;
    return (inputTokens * inputRate) + (500 * outputRate);
  }

  async health() {
    const start = Date.now();
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          system: "Respond with OK.",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 10,
        }),
        signal: AbortSignal.timeout(10000),
      });
      return success({ ok: response.ok, latencyMs: Date.now() - start });
    } catch {
      return success({ ok: false, latencyMs: Date.now() - start });
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const isHaiku = this.model.includes("haiku");
    const inputRate = isHaiku ? 0.00000025 : 0.000003;
    const outputRate = isHaiku ? 0.00000125 : 0.000015;
    return (inputTokens * inputRate) + (outputTokens * outputRate);
  }
}
