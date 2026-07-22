import type { LlmProvider } from "./interface";
import { OpenAIProvider } from "./openai";

export class AiProviderRegistry {
  private providers = new Map<string, LlmProvider>();

  register(provider: LlmProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): LlmProvider | undefined {
    return this.providers.get(name);
  }

  getDefault(name?: string): LlmProvider {
    const key = name || "openai";
    return this.providers.get(key) || this.providers.values().next().value!;
  }

  getAll(): LlmProvider[] {
    return Array.from(this.providers.values());
  }
}

export const aiProviderRegistry = new AiProviderRegistry();

// Register built-in providers
if (process.env.OPENAI_API_KEY) {
  aiProviderRegistry.register(new OpenAIProvider());
}
