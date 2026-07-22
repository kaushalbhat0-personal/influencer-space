import type { CreatorProfile, ImportSource } from "@/lib/provisioning/engine";

export type { CreatorProfile, ImportSource };

export interface ImportAnalysisResult {
  confidence: number;
  completeness: number;
  warnings: string[];
  creatorProfile: CreatorProfile;
}

export interface CreatorImportAdapter {
  source: ImportSource;
  label: string;
  description: string;
  validate(input: string): { valid: boolean; error?: string };
  analyze(input: string): Promise<ImportAnalysisResult>;
}

export interface ImportRecord {
  id: string;
  source: ImportSource;
  input: string;
  creatorName: string;
  tenantId: string;
  storefrontUrl: string;
  status: "started" | "completed" | "failed";
  confidence: number;
  completeness: number;
  warnings: string[];
  duration: number;
  errors: string[];
  createdAt: string;
}

export interface ImportResult {
  success: boolean;
  tenantId: string;
  storefrontUrl: string;
  status: "published" | "failed";
  record: ImportRecord;
  error?: string;
}
