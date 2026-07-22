"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdapter } from "@/lib/import/adapters";
import { provisioningEngine } from "@/lib/provisioning/engine";
import { QualityGate } from "@/lib/provisioning/quality-gate";
import { track } from "@/lib/analytics";
import { logAction } from "@/lib/audit";
import type { ImportSource, CreatorProfile, ImportAnalysisResult, ImportRecord, ImportResult } from "@/lib/import/types";

let importCounter = 0;
function nextId(): string {
  importCounter++;
  return `import_${Date.now()}_${importCounter}`;
}

export async function analyzeCreatorImport(source: ImportSource, input: string): Promise<ImportAnalysisResult> {
  const adapter = getAdapter(source);
  if (!adapter) {
    return { confidence: 0, completeness: 0, warnings: [`Unsupported import source: "${source}".`], creatorProfile: emptyProfile(source) };
  }

  const validation = adapter.validate(input);
  if (!validation.valid) {
    return { confidence: 0, completeness: 0, warnings: [validation.error || "Invalid input."], creatorProfile: emptyProfile(source) };
  }

  track("generation:started", { source, input });
  const result = await adapter.analyze(input);
  track("generation:completed", { source, input, confidence: result.confidence, completeness: result.completeness, warningCount: result.warnings.length });
  return result;
}

export async function importCreator(
  source: ImportSource,
  input: string,
  profile: CreatorProfile,
): Promise<ImportResult> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? "system";
  const startedAt = Date.now();
  const recordId = nextId();
  const record: ImportRecord = {
    id: recordId, source, input, creatorName: profile.brandName,
    tenantId: "", storefrontUrl: "", status: "started", confidence: 0,
    completeness: 0, warnings: [], duration: 0, errors: [], createdAt: new Date().toISOString(),
  };

  try {
    track("publish:started", { source, creatorName: profile.brandName });

    const provisionResult = await provisioningEngine.provision(profile, userId);
    if (!provisionResult.success) {
      record.status = "failed";
      record.errors = provisionResult.errors;
      record.tenantId = provisionResult.tenantId;
      record.duration = Date.now() - startedAt;
      track("publish:completed", { source, status: "failed", errors: provisionResult.errors.join(",") });
      return { success: false, tenantId: provisionResult.tenantId, storefrontUrl: provisionResult.storefrontUrl, status: "failed", record, error: provisionResult.errors.join(", ") };
    }

    const qualityReport = await QualityGate.run(provisionResult.tenantId);

    record.tenantId = provisionResult.tenantId;
    record.storefrontUrl = provisionResult.storefrontUrl;

    if (qualityReport.published) {
      record.status = "completed";
      track("publish:completed", { source, status: "published", tenantId: provisionResult.tenantId });
    } else {
      record.status = "failed";
      record.errors = [`Quality score ${qualityReport.score}%`];
      track("publish:completed", { source, status: "draft", score: qualityReport.score });
    }

    record.duration = Date.now() - startedAt;
    record.confidence = qualityReport.score;
    record.completeness = qualityReport.score;

    const status = qualityReport.published ? "published" : "failed";

    await logAction(provisionResult.tenantId, "import:completed", {
      source, recordId, creatorName: profile.brandName, status,
      confidence: qualityReport.score, duration: record.duration,
    }).catch(() => {});

    return {
      success: qualityReport.published,
      tenantId: provisionResult.tenantId,
      storefrontUrl: provisionResult.storefrontUrl,
      status,
      record,
      error: qualityReport.published ? undefined : `Quality score ${qualityReport.score}%`,
    };
  } catch (e) {
    record.status = "failed";
    record.errors = [String(e)];
    record.duration = Date.now() - startedAt;
    track("publish:completed", { source, status: "failed", error: String(e) });
    return { success: false, tenantId: "", storefrontUrl: "", status: "failed", record, error: String(e) };
  }
}

function emptyProfile(source: ImportSource): CreatorProfile {
  return {
    source, creatorName: "", brandName: "", tagline: "", bio: "", heroTitle: "",
    aboutText: "", tone: "", niche: "", audience: "", products: [], services: [],
    socialLinks: [], seoTitle: "", seoDesc: "",
    palette: { primary: "#6366f1", secondary: "#a78bfa" },
    faq: [], testimonials: [], pages: [],
  };
}
