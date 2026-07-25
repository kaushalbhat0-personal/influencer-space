export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryable: (error: unknown) => boolean;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryable: (err) => {
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      if (msg.includes("not found") || msg.includes("invalid") || msg.includes("unauthorized")) return false;
      if (msg.includes("timeout") || msg.includes("econnrefused") || msg.includes("rate limit") || msg.includes("too many")) return true;
    }
    return true;
  },
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function calculateBackoff(attempt: number, config: RetryConfig): number {
  const delay = Math.min(config.baseDelayMs * Math.pow(2, attempt - 1), config.maxDelayMs);
  return delay + Math.random() * delay * 0.1;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<{ success: boolean; data?: T; error?: string; attempts: number }> {
  const merged: RetryConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 1; attempt <= merged.maxAttempts; attempt++) {
    try {
      const data = await fn();
      if (attempt > 1) console.log(`[Retry] Succeeded on attempt ${attempt}/${merged.maxAttempts}`);
      return { success: true, data, attempts: attempt };
    } catch (err) {
      lastError = err;
      const canRetry = merged.retryable(err);
      const isLastAttempt = attempt >= merged.maxAttempts;

      if (!canRetry || isLastAttempt) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Retry] Failed after ${attempt} attempt(s): ${msg}`);
        return { success: false, error: msg, attempts: attempt };
      }

      const delay = calculateBackoff(attempt, merged);
      console.log(`[Retry] Attempt ${attempt}/${merged.maxAttempts} failed. Retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }

  return { success: false, error: String(lastError), attempts: merged.maxAttempts };
}

export { DEFAULT_CONFIG as DEFAULT_RETRY_CONFIG };
