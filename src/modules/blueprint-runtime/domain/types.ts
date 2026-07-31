import type { WebsiteBlueprint, BlueprintPage, BlueprintSection, BlueprintNavItem } from "@/modules/website-blueprint/domain/types";

export interface BlueprintRuntime {
  blueprint: WebsiteBlueprint;
  resolved: ResolvedRuntime;
  metadata: RuntimeMetadata;
  features: RuntimeFeatures;
}

export interface ResolvedRuntime {
  pages: ResolvedPage[];
  navigation: BlueprintNavItem[];
  globalSections: ResolvedSection[];
  layout: ResolvedLayout;
  theme: ResolvedTheme;
}

export interface ResolvedPage {
  id: string;
  slug: string;
  title: string;
  sections: ResolvedSection[];
  seo: { title: string; description: string; noIndex: boolean };
  layout: { width: string; showTitle: boolean };
}

export interface ResolvedSection {
  id: string;
  type: string;
  label: string;
  order: number;
  visibility: "visible" | "hidden" | "premium" | "disabled";
  configuration: Record<string, unknown>;
  layoutHints: { width: string; padding: string; background: string };
}

export interface ResolvedLayout {
  pageWidth: string;
  contentSpacing: string;
  containerStyle: string;
}

export interface ResolvedTheme {
  packageId: string;
  mode: string;
  colors: { primary: string; secondary: string };
}

export interface RuntimeMetadata {
  version: string;
  resolvedAt: string;
  validationStatus: "valid" | "warnings" | "errors";
  pageCount: number;
  sectionCount: number;
}

export interface RuntimeFeatures {
  booking: boolean;
  commerce: boolean;
  community: boolean;
  analytics: boolean;
  aiWidgets: boolean;
  premium: boolean;
}

export interface BlueprintValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  code: string;
  message: string;
  path: string;
}

export enum RuntimeEventType {
  BlueprintResolved = "blueprint.resolved",
  BlueprintValidated = "blueprint.validated",
  ProvisioningStarted = "provisioning.started",
  ProvisioningCompleted = "provisioning.completed",
  PublishingStarted = "publishing.started",
  PublishingCompleted = "publishing.completed",
}

export interface RuntimeEvent {
  type: RuntimeEventType;
  timestamp: string;
  blueprintId: string;
  metadata?: Record<string, unknown>;
}
