import type { AIProvider, AIPrompt, AIOptions } from "@/lib/generation/contracts";
import type { EventPublisher } from "@/lib/generation/contracts";
import { failure } from "../infrastructure/helpers/result";

export const PROVIDER_EVENTS = {
  SELECTED: "provider.selected",
  FAILED: "provider.failed",
  FALLBACK: "provider.fallback",
  CACHED: "provider.cached",
  RATE_LIMITED: "provider.rate_limited",
  HEALTH_CHANGED: "provider.health_changed",
};

export class ProviderFallback {
  constructor(private events: EventPublisher) {}

  async executeWithFallback(
    providers: AIProvider[],
    prompt: AIPrompt,
    options?: AIOptions,
  ) {
    let lastError: Error | null = null;

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i]!;
      try {
        await this.publishEvent(PROVIDER_EVENTS.SELECTED, {
          provider: provider.name,
          index: i,
          timestamp: new Date().toISOString(),
        });

        const result = await provider.generate(prompt, options);
        if (result.success) return result;

        lastError = result.error instanceof Error ? result.error : new Error(result.error as string);

        await this.publishEvent(PROVIDER_EVENTS.FAILED, {
          provider: provider.name,
          error: lastError.message,
          timestamp: new Date().toISOString(),
        });

        if (i < providers.length - 1) {
          await this.publishEvent(PROVIDER_EVENTS.FALLBACK, {
            fromProvider: provider.name,
            toProvider: providers[i + 1]!.name,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        await this.publishEvent(PROVIDER_EVENTS.FAILED, {
          provider: provider.name,
          error: lastError.message,
          timestamp: new Date().toISOString(),
        });

        if (i < providers.length - 1) {
          await this.publishEvent(PROVIDER_EVENTS.FALLBACK, {
            fromProvider: provider.name,
            toProvider: providers[i + 1]!.name,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return failure(lastError ?? new Error("All providers failed"));
  }

  private async publishEvent(eventType: string, payload: Record<string, unknown>): Promise<void> {
    try { await this.events.publish(eventType, payload); } catch {}
  }
}
