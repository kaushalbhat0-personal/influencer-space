import type { LlmProvider, LlmMessage, LlmResponse, LlmConfig } from "./interface";

export class OpenAIProvider implements LlmProvider {
  readonly name = "openai";
  readonly config: LlmConfig;

  constructor(config?: Partial<LlmConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.OPENAI_API_KEY,
      model: config?.model || "gpt-4o-mini",
      maxTokens: config?.maxTokens || 1024,
      temperature: config?.temperature ?? 0.3,
    };
  }

  async execute(messages: LlmMessage[], overrides?: Partial<LlmConfig>): Promise<LlmResponse> {
    const apiKey = overrides?.apiKey || this.config.apiKey;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const model = overrides?.model || this.config.model || "gpt-4o-mini";
    const t0 = performance.now();

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: overrides?.maxTokens || this.config.maxTokens || 1024,
        temperature: overrides?.temperature ?? this.config.temperature ?? 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI API error ${res.status}: ${body}`);
    }

    const json = await res.json();
    const latencyMs = Math.round(performance.now() - t0);

    return {
      content: json.choices?.[0]?.message?.content || "",
      model: json.model || model,
      latencyMs,
      tokenUsage: json.usage
        ? { prompt: json.usage.prompt_tokens, completion: json.usage.completion_tokens, total: json.usage.total_tokens }
        : null,
    };
  }
}
