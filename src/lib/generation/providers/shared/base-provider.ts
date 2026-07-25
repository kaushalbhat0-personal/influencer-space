import type { AIProvider, AIPrompt, AIOptions, AIResponse, AsyncResult } from "@/lib/generation/contracts";
import { success } from "../../infrastructure/helpers/result";
import { getModelCapability, estimateTokens } from "./provider-types";
import { countPromptTokens } from "./provider-utils";

export abstract class BaseProvider implements AIProvider {
  abstract readonly name: string;
  abstract readonly supportsStreaming: boolean;
  abstract readonly supportsJsonMode: boolean;
  abstract readonly model: string;

  abstract generate(prompt: AIPrompt, options?: AIOptions): AsyncResult<AIResponse>;

  estimateCost(prompt: AIPrompt): number {
    const cap = getModelCapability(this.model);
    if (!cap) return 0;

    const inputTokens = countPromptTokens(prompt);
    const outputTokens = 500;
    return (inputTokens * cap.costPerInputToken) + (outputTokens * cap.costPerOutputToken);
  }

  async health() {
    const start = Date.now();
    try {
      const result = await this.generate({
        system: "Respond with OK.",
        messages: [{ role: "user", content: "ping" }],
      });
      const latencyMs = Date.now() - start;
      if (result.success) {
        return success({ ok: true, latencyMs });
      }
      return success({ ok: false, latencyMs });
    } catch {
      return success({ ok: false, latencyMs: Date.now() - start });
    }
  }

  supportsModel(model: string): boolean {
    return model === this.model || model.endsWith(`/${this.model}`);
  }

  maxContext(): number {
    const cap = getModelCapability(this.model);
    return cap?.maxContextTokens ?? 4096;
  }

  protected buildResponse(content: string, model: string, latencyMs: number, cached = false): AIResponse {
    return {
      content,
      model,
      latencyMs,
      tokenUsage: {
        prompt: estimateTokens(content),
        completion: estimateTokens(content),
        total: estimateTokens(content) * 2,
      },
      cost: 0,
      cached,
    };
  }
}
