import type { AIPrompt, AIOptions, AIResponse } from "@/lib/generation/contracts";
import { success } from "../../infrastructure/helpers/result";
import type { Result } from "@/lib/generation/domain";
import { BaseProvider } from "../shared/base-provider";

export class MockProvider extends BaseProvider {
  readonly name = "mock";
  readonly supportsStreaming = false;
  readonly supportsJsonMode = true;
  readonly model = "mock-model";

  async generate(prompt: AIPrompt, _options?: AIOptions): Promise<Result<AIResponse>> {
    void _options;
    const start = Date.now();
    const content = this.generateMockResponse(prompt);
    const latencyMs = Date.now() - start;
    return success(this.buildResponse(content, this.model, latencyMs));
  }

  private generateMockResponse(prompt: AIPrompt): string {
    if (prompt.responseFormat === "json_object") {
      return JSON.stringify({
        status: "ok",
        data: { message: "Mock response", source: prompt.system.slice(0, 50) },
        generated: true,
      });
    }

    if (prompt.system.toLowerCase().includes("theme")) {
      return JSON.stringify({
        primary: "#3B82F6",
        secondary: "#10B981",
        accent: "#8B5CF6",
      });
    }

    if (prompt.system.toLowerCase().includes("seo") || prompt.system.toLowerCase().includes("description")) {
      return `This is a mock SEO description generated for testing purposes. It covers the key aspects of the content in a concise manner.`;
    }

    return `Mock response for: ${prompt.system.slice(0, 100)}`;
  }
}
