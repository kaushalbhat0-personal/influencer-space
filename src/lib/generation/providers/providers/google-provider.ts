import type { AIProvider, AIPrompt, AIOptions, AIResponse } from "@/lib/generation/contracts";
import type { Result } from "@/lib/generation/domain";
import { success, failure } from "../../infrastructure/helpers/result";

export class GoogleProvider implements AIProvider {
  readonly name = "google";
  readonly supportsStreaming = true;
  readonly supportsJsonMode = true;

  constructor(private config: { apiKey?: string; model?: string; baseUrl?: string } = {}) {}

  private get model(): string {
    return this.config.model ?? "gemini-1.5-flash";
  }

  async generate(prompt: AIPrompt, options?: AIOptions): Promise<Result<AIResponse>> {
    if (!this.config.apiKey) {
      return failure(new Error("Google API key not configured"));
    }

    const start = Date.now();
    try {
      const url = `${this.config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta"}/models/${options?.model ?? this.model}:generateContent?key=${this.config.apiKey}`;

      const contents = prompt.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      if (prompt.system) {
        contents.unshift({
          role: "user",
          parts: [{ text: `System instruction: ${prompt.system}` }],
        });
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: options?.maxTokens ?? 2048,
            temperature: options?.temperature ?? 0.7,
          },
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const body = await response.text();
        return failure(new Error(`Google API error: ${response.status} - ${body}`));
      }

      const data = await response.json();
      const latencyMs = Date.now() - start;
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      return success({
        content,
        model: this.model,
        latencyMs,
        tokenUsage: {
          prompt: data.usageMetadata?.promptTokenCount ?? 0,
          completion: data.usageMetadata?.candidatesTokenCount ?? 0,
          total: (data.usageMetadata?.promptTokenCount ?? 0) + (data.usageMetadata?.candidatesTokenCount ?? 0),
        },
        cost: this.calculateCost(data.usageMetadata?.promptTokenCount ?? 0, data.usageMetadata?.candidatesTokenCount ?? 0),
        cached: false,
      });
    } catch (err) {
      return failure(new Error(`Google request failed: ${err instanceof Error ? err.message : String(err)}`));
    }
  }

  estimateCost(prompt: AIPrompt): number {
    const inputTokens = Math.ceil(prompt.system.length / 4) +
      prompt.messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
    const isFlash = this.model.includes("flash");
    const inputRate = isFlash ? 0.000000075 : 0.00000125;
    const outputRate = isFlash ? 0.0000003 : 0.000005;
    return (inputTokens * inputRate) + (500 * outputRate);
  }

  async health() {
    const start = Date.now();
    try {
      const url = `${this.config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta"}/models?key=${this.config.apiKey}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return success({ ok: response.ok, latencyMs: Date.now() - start });
    } catch {
      return success({ ok: false, latencyMs: Date.now() - start });
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const isFlash = this.model.includes("flash");
    const inputRate = isFlash ? 0.000000075 : 0.00000125;
    const outputRate = isFlash ? 0.0000003 : 0.000005;
    return (inputTokens * inputRate) + (outputTokens * outputRate);
  }
}
