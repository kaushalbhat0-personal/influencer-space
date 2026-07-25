import type { PromptContext, RenderedPrompt } from "./types";
import { TemplateEngine } from "./template-engine";
import { VersionedPromptRegistry } from "./prompt-registry";

export class PromptOrchestrator {
  private engine = new TemplateEngine();

  constructor(private registry: VersionedPromptRegistry) {}

  get(stage: string, context: PromptContext): RenderedPrompt {
    const version = this.resolveVersion(stage, context);
    const template = this.registry.resolve(stage, version, context.niche);

    const rendered = this.engine.render(template, context);

    this.registry.trackUsage(template.id, rendered.renderTimeMs, false);

    return rendered;
  }

  getWithInheritance(stage: string, context: PromptContext): RenderedPrompt {
    const version = this.resolveVersion(stage, context);
    const chain = this.registry.resolveChain(stage, version, context.niche);
    const rendered = this.engine.render(chain.resolved, context);

    this.registry.trackUsage(chain.resolved.id, rendered.renderTimeMs, false);

    return rendered;
  }

  resolveVersion(stage: string, context: PromptContext): string {
    const strategyVersion = context.variables?.promptVersions?.[stage as keyof typeof context.variables.promptVersions];
    if (typeof strategyVersion === "string") return strategyVersion;
    return "v1";
  }
}
