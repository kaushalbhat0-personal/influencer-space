import { describe, it, expect, beforeEach } from "vitest";
import { TemplateEngine } from "@/lib/generation/prompts/template-engine";
import { VersionedPromptRegistry } from "@/lib/generation/prompts/prompt-registry";
import { PromptOrchestrator } from "@/lib/generation/prompts/prompt-orchestrator";
import { PromptValidator } from "@/lib/generation/prompts/validation";
import { registerPromptDefinitions } from "@/lib/generation/prompts/definitions/index";
import type { PromptTemplate, PromptContext } from "@/lib/generation/prompts/types";

const sampleTemplate: PromptTemplate = {
  id: "test.v1",
  stage: "test",
  version: "v1",
  system: "You are helping {{creatorName}} with {{niche}} content.",
  template: "Create content for {{creatorName}} in {{niche}}. Topic: {{topic}}.",
  variables: [
    { name: "topic", type: "string", required: true, description: "Content topic" },
  ],
  maxTokens: 200,
  temperature: 0.7,
};

const sampleContext: PromptContext = {
  stage: "test",
  niche: "fitness",
  strategyType: "pro",
  variables: { topic: "workout routines" },
  creatorName: "TestCreator",
};

describe("TemplateEngine", () => {
  let engine: TemplateEngine;

  beforeEach(() => { engine = new TemplateEngine(); });

  it("renders template with variables", () => {
    const result = engine.render(sampleTemplate, sampleContext);
    expect(result.system).toContain("TestCreator");
    expect(result.system).toContain("fitness");
    expect(result.messages[0]!.content).toContain("workout routines");
  });

  it("throws on missing required variables", () => {
    expect(() => engine.render(sampleTemplate, { ...sampleContext, variables: {} })).toThrow("Missing required variables");
  });

  it("handles array variables", () => {
    const result = engine.render({ ...sampleTemplate, template: "Items: {{items}}" }, { ...sampleContext, variables: { items: ["a", "b", "c"], topic: "x" } });
    expect(result.messages[0]!.content).toContain("a, b, c");
  });

  it("tracks render time", () => {
    const result = engine.render(sampleTemplate, sampleContext);
    expect(result.renderTimeMs).toBeGreaterThanOrEqual(0);
  });
});

describe("VersionedPromptRegistry", () => {
  let registry: VersionedPromptRegistry;

  beforeEach(() => { registry = new VersionedPromptRegistry(); });

  it("registers and resolves prompts", () => {
    registry.register(sampleTemplate);
    const resolved = registry.resolve("test", "v1");
    expect(resolved.id).toBe("test.v1");
  });

  it("throws on duplicate registration", () => {
    registry.register(sampleTemplate);
    expect(() => registry.register(sampleTemplate)).toThrow("Duplicate");
  });

  it("resolves by niche override", () => {
    registry.register(sampleTemplate);
    const nicheTemplate: PromptTemplate = { ...sampleTemplate, id: "test.niche.v1", niche: "fitness" };
    registry.register(nicheTemplate);
    const resolved = registry.resolve("test", "v1", "fitness");
    expect(resolved.niche).toBe("fitness");
  });

  it("falls back to base when niche not found", () => {
    registry.register(sampleTemplate);
    const resolved = registry.resolve("test", "v1", "unknown");
    expect(resolved.id).toBe("test.v1");
  });

  it("resolves default version", () => {
    registry.register({ ...sampleTemplate, version: "default" });
    const resolved = registry.resolve("test", "v99");
    expect(resolved.id).toBe("test.v1");
  });

  it("supports inheritance chain", () => {
    const base: PromptTemplate = {
      id: "base.v1", stage: "test", version: "v1",
      system: "Base system for {{niche}}", template: "Base template for {{creatorName}}",
      variables: [], maxTokens: 100,
    };
    const child: PromptTemplate = {
      id: "child.v2", stage: "test", version: "v2", parentId: "base.v1",
      system: "Child system for {{niche}}", template: "",
      variables: [], maxTokens: 200,
    };
    registry.register(base);
    registry.register(child);

    const chain = registry.resolveChain("test", "v2");
    expect(chain.ancestors).toHaveLength(1);
    expect(chain.resolved.system).toBe("Child system for {{niche}}");
    expect(chain.resolved.template).toBe("Base template for {{creatorName}}");
  });

  it("throws when parent not found", () => {
    const orphan: PromptTemplate = {
      id: "orphan.v1", stage: "test", version: "v1", parentId: "nonexistent",
      system: "Orphan", template: "Orphan", variables: [], maxTokens: 100,
    };
    expect(() => registry.register(orphan)).toThrow("Parent prompt \"nonexistent\" not found");
  });

  it("tracks usage metrics", () => {
    registry.register(sampleTemplate);
    registry.trackUsage("test.v1", 50, true);
    registry.trackUsage("test.v1", 30, false);
    const metrics = registry.getMetrics("test.v1")!;
    expect(metrics.usageCount).toBe(2);
    expect(metrics.cacheHits).toBe(1);
    expect(metrics.totalRenderTimeMs).toBe(80);
  });

  it("returns null metrics for unknown id", () => {
    expect(registry.getMetrics("unknown")).toBeNull();
  });

  it("lists prompts by stage", () => {
    const other: PromptTemplate = { ...sampleTemplate, id: "other.v1", stage: "other" };
    registry.register(sampleTemplate);
    registry.register(other);
    expect(registry.list("test")).toHaveLength(1);
    expect(registry.list()).toHaveLength(2);
  });
});

describe("PromptOrchestrator", () => {
  let orchestrator: PromptOrchestrator;
  let registry: VersionedPromptRegistry;

  beforeEach(() => {
    registry = new VersionedPromptRegistry();
    registry.register(sampleTemplate);
    orchestrator = new PromptOrchestrator(registry);
  });

  it("returns rendered prompt for stage", () => {
    const result = orchestrator.get("test", sampleContext);
    expect(result.templateId).toBe("test.v1");
    expect(result.system).toContain("TestCreator");
  });

  it("resolves version from strategy promptVersions", () => {
    const v2Template: PromptTemplate = { ...sampleTemplate, id: "test.v2", version: "v2", template: "V2 content for {{creatorName}}" };
    registry.register(v2Template);
    const ctx: PromptContext = {
      ...sampleContext,
      variables: { topic: "x", promptVersions: { test: "v2" } },
    };
    const result = orchestrator.get("test", ctx);
    expect(result.version).toBe("v2");
  });
});

describe("PromptValidator", () => {
  let validator: PromptValidator;

  beforeEach(() => { validator = new PromptValidator(); });

  it("validates registered prompts", () => {
    const registry = new VersionedPromptRegistry();
    registry.register(sampleTemplate);
    const result = validator.validateAll(registry);
    expect(result.valid).toBe(true);
  });

  it("detects missing parents", () => {
    const registry = new VersionedPromptRegistry();
    registry.register({ ...sampleTemplate, id: "parent.v1", version: "v1" });
    const orphan = { ...sampleTemplate, id: "child.v2", version: "v2", parentId: "nonexistent" };
    expect(() => registry.register(orphan)).toThrow("Parent prompt");
  });

  it("detects circular inheritance", () => {
    const registry = new VersionedPromptRegistry();
    registry.register({ ...sampleTemplate, id: "circ_a", stage: "circ", version: "v1", parentId: "circ_e" }, true);
    registry.register({ ...sampleTemplate, id: "circ_b", stage: "circ", version: "v2", parentId: "circ_a" }, true);
    registry.register({ ...sampleTemplate, id: "circ_c", stage: "circ", version: "v3", parentId: "circ_b" }, true);
    registry.register({ ...sampleTemplate, id: "circ_d", stage: "circ", version: "v4", parentId: "circ_c" }, true);
    registry.register({ ...sampleTemplate, id: "circ_e", stage: "circ", version: "v5", parentId: "circ_d" }, true);
    const result = validator.validateAll(registry);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Circular"))).toBe(true);
  });

  it("warns on undefined template variables", () => {
    const registry = new VersionedPromptRegistry();
    registry.register({ ...sampleTemplate, template: "{{undefinedVar}}", variables: [] });
    const result = validator.validateAll(registry);
    expect(result.warnings.some((w) => w.includes("undefinedVar"))).toBe(true);
  });
});

describe("Prompt definitions integration", () => {
  it("registers all built-in prompt definitions", () => {
    const registry = new VersionedPromptRegistry();
    registerPromptDefinitions(registry);
    const all = registry.list();
    expect(all.length).toBeGreaterThan(10);
    expect(all.some((t) => t.stage === "hero")).toBe(true);
    expect(all.some((t) => t.stage === "about")).toBe(true);
    expect(all.some((t) => t.stage === "seo")).toBe(true);
    expect(all.some((t) => t.stage === "branding")).toBe(true);
    expect(all.some((t) => t.stage === "products")).toBe(true);
    expect(all.some((t) => t.stage === "cta")).toBe(true);
    expect(all.some((t) => t.stage === "faq")).toBe(true);
  });

  it("validates successfully after registration", () => {
    const registry = new VersionedPromptRegistry();
    registerPromptDefinitions(registry);
    const validator = new PromptValidator();
    const result = validator.validateAll(registry);
    expect(result.valid).toBe(true);
  });

  it("supports inheritance chain resolution for hero v2", () => {
    const registry = new VersionedPromptRegistry();
    registerPromptDefinitions(registry);
    const chain = registry.resolveChain("hero", "v2");
    expect(chain.template.id).toBe("hero.v2");
    expect(chain.resolved.system).toContain("conversion copywriter");
  });

  it("herov3 inherits from herov2 which inherits from herov1", () => {
    const registry = new VersionedPromptRegistry();
    registerPromptDefinitions(registry);
    const chain = registry.resolveChain("hero", "v3");
    expect(chain.ancestors).toHaveLength(2);
    expect(chain.ancestors[0]!.id).toBe("hero.v2");
    expect(chain.ancestors[1]!.id).toBe("hero.v1");
  });
});
