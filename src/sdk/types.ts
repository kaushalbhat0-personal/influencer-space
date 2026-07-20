export type ArtifactType = "module" | "theme" | "capability" | "provider" | "plugin" | "domain" | "surface";

export interface GeneratorContext {
  artifactType: ArtifactType;
  name: string;
  id: string;
  domain?: string;
  description?: string;
  author?: string;
  outputDir: string;
  dryRun: boolean;
  overwrite: boolean;
  preview: boolean;
  timestamp: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: "definition" | "types" | "manifest" | "registration" | "test" | "docs" | "config";
}

export interface GeneratorResult {
  success: boolean;
  artifactType: ArtifactType;
  id: string;
  files: GeneratedFile[];
  warnings: string[];
  errors: string[];
  dryRun: boolean;
  durationMs: number;
}

export interface Generator<TInput = Record<string, unknown>> {
  type: ArtifactType;
  name: string;
  description: string;
  validate(input: TInput): { valid: boolean; errors: string[] };
  generate(ctx: GeneratorContext, input: TInput): GeneratorResult;
}

export interface TemplateFile {
  path: string;
  template: string;
  variables: string[];
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  artifactType: ArtifactType;
  files: TemplateFile[];
}

export interface TemplateRegistryEntry {
  definition: TemplateDefinition;
  registeredAt: string;
}
