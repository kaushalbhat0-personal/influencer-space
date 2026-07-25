import type { PromptTemplate, PromptVariables, PromptContext, RenderedPrompt } from "./types";

export class TemplateEngine {
  render(template: PromptTemplate, context: PromptContext): RenderedPrompt {
    const start = Date.now();

    this.validateVariables(template, context.variables);

    const system = this.interpolate(template.system, context.variables, context);
    const content = this.interpolate(template.template, context.variables, context);

    return {
      system,
      messages: [{ role: "user", content }],
      responseFormat: template.responseFormat,
      maxTokens: template.maxTokens,
      temperature: template.temperature,
      templateId: template.id,
      version: template.version,
      renderTimeMs: Date.now() - start,
    };
  }

  private interpolate(text: string, variables: PromptVariables, context: PromptContext): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
      if (name === "niche") return context.niche;
      if (name === "creatorName") return context.creatorName ?? "Creator";
      if (name === "strategy") return context.strategyType;
      if (name === "locale") return context.locale ?? "en-US";
      return this.formatValue(variables[name]);
    });
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  }

  private validateVariables(template: PromptTemplate, variables: PromptVariables): void {
    const missing: string[] = [];
    for (const v of template.variables) {
      if (v.required && (variables[v.name] === undefined || variables[v.name] === null)) {
        missing.push(v.name);
      }
    }
    if (missing.length > 0) {
      throw new Error(`Missing required variables for prompt "${template.id}" v${template.version}: ${missing.join(", ")}`);
    }
  }
}
