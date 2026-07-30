import type { AIProvider, AIPrompt, AIOptions, AIResponse } from "@/lib/generation/contracts";
import type { Result } from "@/lib/generation/domain";
import { success, failure } from "../infrastructure/helpers/result";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly supportsStreaming = true;
  readonly supportsJsonMode = true;

  constructor(private config: { apiKey?: string; model?: string; baseUrl?: string } = {}) {}

  private get model(): string {
    return this.config.model ?? "gpt-4o-mini";
  }

  async generate(prompt: AIPrompt, options?: AIOptions): Promise<Result<AIResponse>> {
    if (!this.config.apiKey) {
      return failure(new Error("OpenAI API key not configured"));
    }

    const start = Date.now();
    try {
      const response = await fetch(this.config.baseUrl ?? "https://api.openai.com/v1/chat/completions", {
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
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const body = await response.text();
        return failure(new Error(`OpenAI API error: ${response.status} - ${body}`));
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
      return failure(new Error(`OpenAI request failed: ${err instanceof Error ? err.message : String(err)}`));
    }
  }

  estimateCost(prompt: AIPrompt): number {
    const inputTokens = Math.ceil(prompt.system.length / 4) +
      prompt.messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
    const isMini = this.model.includes("mini");
    const inputRate = isMini ? 0.00000015 : 0.0000025;
    const outputRate = isMini ? 0.0000006 : 0.00001;
    return (inputTokens * inputRate) + (500 * outputRate);
  }

  async health() {
    const start = Date.now();
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        signal: AbortSignal.timeout(5000),
      });
      return success({ ok: response.ok, latencyMs: Date.now() - start });
    } catch {
      return success({ ok: false, latencyMs: Date.now() - start });
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const isMini = this.model.includes("mini");
    const inputRate = isMini ? 0.00000015 : 0.0000025;
    const outputRate = isMini ? 0.0000006 : 0.00001;
    return (inputTokens * inputRate) + (outputTokens * outputRate);
  }
}
