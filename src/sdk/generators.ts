import type { Generator, GeneratorContext, GeneratedFile } from "./types";
import { generatorRegistry } from "./engine";

function file(path: string, content: string, type: GeneratedFile["type"] = "definition"): GeneratedFile {
  return { path, content, type };
}

function generateResult(ctx: GeneratorContext, files: GeneratedFile[], warnings: string[] = [], errors: string[] = []): ReturnType<Generator["generate"]> {
  return { success: errors.length === 0, artifactType: ctx.artifactType, id: ctx.id, files, warnings, errors, dryRun: ctx.dryRun, durationMs: 0 };
}

function validateBasics(id: string, name: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!id || id.length < 5) errors.push("ID must be at least 5 characters");
  if (!id.match(/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*\.[a-z][a-z0-9-]+$/)) errors.push("ID must be reverse-DNS format (e.g., com.creatos.my-module)");
  if (!name || name.trim().length === 0) errors.push("Name is required");
  return { valid: errors.length === 0, errors };
}

export const moduleGenerator: Generator<{ domain: string; surfaces: string[]; dependencies: string[] }> = {
  type: "module", name: "Module Generator", description: "Generate a complete CreatorOS module",
  validate(input) {
    const base = validateBasics(input.domain ? `com.creatos.${input.domain}` : "", input.domain ?? "");
    return base;
  },
  generate(ctx, input) {
    const dom = input.domain || ctx.domain || "content";
    const moduleId = ctx.id || `com.creatos.${ctx.name.toLowerCase().replace(/\s+/g, "-")}`;
    const version = "1.0.0";
    const lower = ctx.name.toLowerCase().replace(/\s+/g, "-");

    const definitionTs = `import type { ModuleDefinition } from "@/lib/module/types";

export const ${lower}Module: ModuleDefinition = {
  identity: { id: "${moduleId}", name: "${ctx.name}", version: "${version}", domain: "${dom}", description: "${ctx.description || ctx.name + " module"}", author: { type: "platform", id: "com.creatos", name: "CreatorOS" }, icon: "Box", category: "${dom}", tags: ["${lower}"] },
  composition: { capabilities: [], serviceContracts: [], dependencies: ${JSON.stringify(input.dependencies?.map((d) => ({ moduleId: d, required: true })) ?? [])} },
  surfaces: { supported: ${JSON.stringify(input.surfaces?.map((s) => ({ surfaceId: s, rendererPath: "", interactive: s === "website", streaming: false, cacheable: true })) ?? [{ surfaceId: "website", rendererPath: "", interactive: false, streaming: false, cacheable: true }])}, dataLoaderPath: "@/${lower}/data-loader#${lower}DataLoader", defaultSurface: "website" },
  configuration: { schema: {}, defaults: {}, settingsKey: "module_config:${moduleId}", overridableByCreator: [], lockedByTheme: [] },
  theme: { tokensConsumed: ["color.text.primary", "spacing.4", "radius.md"], variantSlots: [] },
  ai: { contextProviderPath: "", aiCapabilities: [] },
  permissions: { requiredPlanTiers: ["STARTER", "PRO"], featureFlags: [], agencyPermissions: [], minimumRole: "ADMIN" },
  events: { published: [], subscribed: [] },
  marketplace: { previewImages: [], tags: ["${lower}"], pricing: { model: "free" }, compatibleThemes: ["*"], minPlatformVersion: "1.0.0", changelog: "", documentationUrl: null },
  manifest: { id: "${moduleId}", name: "${ctx.name}", version: "${version}", domain: "${dom}", description: "${ctx.description || ctx.name + " module"}", author: { type: "platform", id: "com.creatos", name: "CreatorOS" }, license: "MIT", icon: "Box", category: "${dom}", tags: ["${lower}"], minPlatformVersion: "1.0.0", pricing: { model: "free" }, previewImages: [], documentationUrl: null, createdAt: "${ctx.timestamp}", updatedAt: "${ctx.timestamp}" },
};`;

    const dataLoaderTs = `import { prisma } from "@/lib/prisma";

export async function ${lower}DataLoader(tenantId: string, _config: Record<string, unknown>, _context: Record<string, unknown>) {
  void _config; void _context;
  return { tenantId, message: "${ctx.name} module loaded" };
}`;

    const indexTs = `export { ${lower}Module } from "./definition";
export { ${lower}DataLoader } from "./data-loader";`;

    const testTs = `import { describe, it, expect } from "vitest";
import { ${lower}Module } from "../definition";

describe("${ctx.name} Module", () => {
  it("should have valid identity", () => {
    expect(${lower}Module.identity.id).toBe("${moduleId}");
    expect(${lower}Module.identity.name).toBe("${ctx.name}");
  });
  it("should support website surface", () => {
    expect(${lower}Module.surfaces.supported.some((s) => s.surfaceId === "website")).toBe(true);
  });
});`;

    const readmeMd = `# ${ctx.name} Module

- **ID:** \`${moduleId}\`
- **Domain:** ${dom}
- **Version:** ${version}

## Usage

\`\`\`typescript
import { ${lower}Module } from "@/modules/${lower}";
\`\`\`

## Configuration

See \`module_config:${moduleId}\` in the Configuration Engine.
`;

    return generateResult(ctx, [
      file(`${ctx.outputDir}/definition.ts`, definitionTs, "definition"),
      file(`${ctx.outputDir}/data-loader.ts`, dataLoaderTs, "config"),
      file(`${ctx.outputDir}/index.ts`, indexTs, "registration"),
      file(`${ctx.outputDir}/__tests__/module.test.ts`, testTs, "test"),
      file(`${ctx.outputDir}/README.md`, readmeMd, "docs"),
    ]);
  },
};

export const themeGenerator: Generator<{ extends?: string; tokens: Record<string, string> }> = {
  type: "theme", name: "Theme Generator", description: "Generate a complete CreatorOS theme",
  validate(input) { return validateBasics(`com.creatos.${input.extends || "custom"}`, input.extends || "custom"); },
  generate(ctx, input) {
    const themeId = ctx.id || `com.creatos.${ctx.name.toLowerCase().replace(/\s+/g, "-")}`;
    const tokenEntries = Object.entries(input?.tokens ?? {});
    const tokenJson = tokenEntries.length > 0 ? JSON.stringify(input!.tokens, null, 2) : '{\n  "color.surface.primary": "#0a0a0a"\n}';

    const definitionTs = `import type { Theme } from "@/lib/theme/types";

export const ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Theme: Theme = {
  identity: { id: "${themeId}", name: "${ctx.name}", version: "1.0.0", author: { type: "platform", id: "com.creatos" } },
  inheritance: { extends: ${input?.extends ? `"${input.extends}"` : "null"}, overridableTokens: [], lockedTokens: [] },
  tokens: ${tokenJson},
  variants: {},
  layouts: [],
  fonts: [],
  animations: [],
  surfaceOverrides: {},
  marketplace: { previewImages: [], tags: [], pricing: { free: true }, compatibleModules: ["*"], minPlatformVersion: "1.0.0" },
};`;

    const manifestTs = `import type { ThemeManifest } from "@/lib/theme/types";

export const ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Manifest: ThemeManifest = {
  id: "${themeId}", name: "${ctx.name}", version: "1.0.0",
  description: "${ctx.description || ctx.name + " theme"}",
  author: { name: "${ctx.author || "CreatorOS"}", type: "platform", id: "com.creatos" },
  license: "MIT", previewImages: [], tags: [], minPlatformVersion: "1.0.0",
  supportedSurfaces: ["website", "website_preview"],
  supportedModules: ["*"],
  pricing: { free: true }, createdAt: "${ctx.timestamp}", updatedAt: "${ctx.timestamp}",
};`;

    const registerTs = `import { themeRegistry } from "@/lib/theme/registry";
import { ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Theme } from "./definition";
import { ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Manifest } from "./manifest";

export function registerTheme(): void {
  themeRegistry.register(${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Theme, ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Manifest, "platform");
}`;

    return generateResult(ctx, [
      file(`${ctx.outputDir}/definition.ts`, definitionTs, "definition"),
      file(`${ctx.outputDir}/manifest.ts`, manifestTs, "manifest"),
      file(`${ctx.outputDir}/register.ts`, registerTs, "registration"),
      file(`${ctx.outputDir}/index.ts`, `export { ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Theme } from "./definition";\nexport { ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Manifest } from "./manifest";\nexport { registerTheme } from "./register";`, "registration"),
    ]);
  },
};

export const capabilityGenerator: Generator = {
  type: "capability", name: "Capability Generator", description: "Generate a CreatorOS capability",
  validate(input) { const n = (input as Record<string, string>).name || "capability"; return validateBasics(`com.creatos.${n}`, n); },
  generate(ctx, _input) {
    void _input;
    const cid = ctx.id || `com.creatos.${ctx.name.toLowerCase().replace(/\s+/g, "-")}`;
    const dom = ctx.domain || "platform";
    return generateResult(ctx, [
      file(`${ctx.outputDir}/types.ts`, `export interface I${ctx.name.replace(/\s/g, "")}Capability {\n  execute(): Promise<void>;\n}`, "types"),
      file(`${ctx.outputDir}/contract.ts`, `import type { CapabilityContract } from "@/lib/capability/types";\nexport const ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Contract: CapabilityContract = { id: "${cid}", name: "${ctx.name}", version: "1.0.0", domain: "${dom}", description: "${ctx.description || ""}", category: "business", interfaceMethods: ["execute"], events: { published: [], subscribed: [] }, dependencies: [], config: {} };`, "definition"),
      file(`${ctx.outputDir}/index.ts`, `export { ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Contract } from "./contract";`, "registration"),
    ]);
  },
};

export const providerGenerator: Generator = {
  type: "provider", name: "Provider Generator", description: "Generate a CreatorOS provider",
  validate(input) { const n = (input as Record<string, string>).name || "provider"; return validateBasics(`com.creatos.${n}`, n); },
  generate(ctx, _input) {
    void _input;
    const pid = ctx.id || `com.creatos.${ctx.name.toLowerCase().replace(/\s+/g, "-")}`;
    return generateResult(ctx, [
      file(`${ctx.outputDir}/contract.ts`, `import type { ProviderContract } from "@/lib/provider/types";\nexport const ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Contract: ProviderContract = { id: "${pid}", type: "integration", name: "${ctx.name}", version: "1.0.0", description: "${ctx.description || ""}", methods: ["connect", "disconnect"] };`, "definition"),
      file(`${ctx.outputDir}/index.ts`, `export { ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Contract } from "./contract";`, "registration"),
    ]);
  },
};

export const pluginGenerator: Generator = {
  type: "plugin", name: "Plugin Generator", description: "Generate a CreatorOS plugin",
  validate(input) { const n = (input as Record<string, string>).name || "plugin"; return validateBasics(`com.creatos.${n}`, n); },
  generate(ctx, _input) {
    void _input;
    const pid = ctx.id || `com.creatos.${ctx.name.toLowerCase().replace(/\s+/g, "-")}`;
    return generateResult(ctx, [
      file(`${ctx.outputDir}/manifest.ts`, `import type { PluginManifest } from "@/lib/plugin/types";\nexport const ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Manifest: PluginManifest = { id: "${pid}", name: "${ctx.name}", version: "1.0.0", author: { name: "${ctx.author || "CreatorOS"}" }, permissions: ["read:tenant"], resources: { maxMemory: 128, maxCpu: 10, maxDuration: 30000, maxRequests: 100 }, hooks: [], events: [], config: {} };`, "manifest"),
      file(`${ctx.outputDir}/index.ts`, `export { ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Manifest } from "./manifest";`, "registration"),
    ]);
  },
};

export const domainGenerator: Generator = {
  type: "domain", name: "Domain Generator", description: "Generate a CreatorOS domain contract",
  validate(input) { const n = (input as Record<string, string>).name || "domain"; return validateBasics(`com.creatos.${n}`, n); },
  generate(ctx, _input) {
    void _input;
    return generateResult(ctx, [
      file(`${ctx.outputDir}/contract.ts`, `import type { DomainContract } from "@/lib/domain/types";\nexport const ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Contract: DomainContract = { id: "${ctx.name.toLowerCase().replace(/\s+/g, "-")}", name: "${ctx.name}", description: "${ctx.description || ""}", version: "1.0.0", responsibilities: [], antiResponsibilities: [], dependencies: [], events: { published: [], subscribed: [] }, capabilities: [], modules: [], metadata: {} };`, "definition"),
      file(`${ctx.outputDir}/index.ts`, `export { ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Contract } from "./contract";`, "registration"),
    ]);
  },
};

export const surfaceGenerator: Generator = {
  type: "surface", name: "Surface Generator", description: "Generate a CreatorOS surface definition",
  validate(input) { const n = (input as Record<string, string>).name || "surface"; return validateBasics(`com.creatos.${n}`, n); },
  generate(ctx, _input) {
    void _input;
    const sid = ctx.name.toLowerCase().replace(/\s+/g, "_");
    return generateResult(ctx, [
      file(`${ctx.outputDir}/definition.ts`, `import type { SurfaceDefinition } from "@/lib/module/surface-registry";\nexport const ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Surface: SurfaceDefinition = { id: "${sid}", name: "${ctx.name}", description: "${ctx.description || ""}", interactive: true, streaming: false, cacheable: true, dimensions: {}, mediaSupport: ["text"], requiresAuth: true, requiresTenant: true, platformVersion: "1.0.0" };`, "definition"),
      file(`${ctx.outputDir}/index.ts`, `export { ${ctx.name.toLowerCase().replace(/[^a-z0-9]/g, "")}Surface } from "./definition";`, "registration"),
    ]);
  },
};

export function registerAllGenerators(): void {
  generatorRegistry.register(moduleGenerator);
  generatorRegistry.register(themeGenerator);
  generatorRegistry.register(capabilityGenerator);
  generatorRegistry.register(providerGenerator);
  generatorRegistry.register(pluginGenerator);
  generatorRegistry.register(domainGenerator);
  generatorRegistry.register(surfaceGenerator);
}
