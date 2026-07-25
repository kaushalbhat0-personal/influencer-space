import type { AIPrompt } from "@/lib/generation/contracts";

export function countPromptTokens(prompt: AIPrompt): number {
  let count = 0;
  count += Math.ceil(prompt.system.length / 4);
  for (const msg of prompt.messages) {
    count += 4;
    count += Math.ceil(msg.content.length / 4);
  }
  return count;
}

export function countResponseTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

export function truncatePrompt(prompt: AIPrompt, maxTokens: number): AIPrompt {
  const used = countPromptTokens(prompt);
  if (used <= maxTokens) return prompt;

  const ratio = maxTokens / used;
  const truncatedMessages = prompt.messages.map((m) => ({
    role: m.role,
    content: m.content.slice(0, Math.floor(m.content.length * ratio)),
  }));

  return {
    system: prompt.system.slice(0, Math.floor(prompt.system.length * ratio)),
    messages: truncatedMessages,
    responseFormat: prompt.responseFormat,
  };
}

export function formatModelName(provider: string, model: string): string {
  if (model.startsWith(`${provider}/`)) return model;
  return `${provider}/${model}`;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithTimeout(url: string, options: RequestInit & { timeoutMs?: number }): Promise<Response> {
  const { timeoutMs = 30000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}
