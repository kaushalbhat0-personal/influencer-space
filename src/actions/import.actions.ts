"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/lib/import/adapters";
import { provisioningService } from "@/modules/provisioning/application/provisioning-service";
import { publishingService } from "@/lib/publishing/service";
import { track } from "@/lib/analytics";
import { logAction } from "@/lib/audit";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";
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
  const startedAt = Date.now();
  const recordId = nextId();
  const record: ImportRecord = {
    id: recordId, source, input, creatorName: profile.brandName,
    tenantId: "", storefrontUrl: "", status: "started", confidence: 0,
    completeness: 0, warnings: [], duration: 0, errors: [], createdAt: new Date().toISOString(),
  };

  try {
    track("publish:started", { source, creatorName: profile.brandName });

    const runId = await provisioningService.createRun({
      creatorName: profile.brandName,
      sourceUrl: input,
      sourcePlatform: source,
    });

    const provisioningInput = {
      runId,
      creatorName: profile.brandName,
      sourceUrl: input,
      sourcePlatform: source,
      generatedContent: {
        heroTitle: profile.heroTitle,
        tagline: profile.tagline,
        aboutSection: profile.aboutText,
        seoTitle: profile.seoTitle,
        seoDescription: profile.seoDesc,
      },
      generatedTheme: {
        preset: "custom",
        colors: { primary: profile.palette.primary, secondary: profile.palette.secondary },
      },
    };

    const provisionResult = await provisioningService.provision(provisioningInput as Parameters<typeof provisioningService.provision>[0]);
    if (!provisionResult.success) {
      record.status = "failed";
      record.tenantId = provisionResult.tenantId;
      record.duration = Date.now() - startedAt;
      track("publish:completed", { source, status: "failed", errors: "Provisioning failed" });
      return { success: false, tenantId: provisionResult.tenantId, storefrontUrl: "", status: "failed", record, error: "Provisioning failed" };
    }

    // Create products from profile
    if (profile.products.length > 0) {
      for (const p of profile.products) {
        await prisma.product.create({
          data: {
            tenantId: provisionResult.tenantId,
            name: p.name,
            price: p.price,
            description: p.description,
            isActive: true,
          },
        });
      }
    }

    // Publish
    const publishResult = await publishingService.publish(provisionResult.tenantId);

    record.tenantId = provisionResult.tenantId;
    record.storefrontUrl = provisionResult.storefrontUrl;
    record.status = publishResult.success ? "completed" : "failed";
    record.duration = Date.now() - startedAt;
    record.confidence = publishResult.success ? 100 : 0;
    record.completeness = publishResult.success ? 100 : 0;

    const status = publishResult.success ? "published" : "failed";

    await logAction(provisionResult.tenantId, "import:completed", {
      source, recordId, creatorName: profile.brandName, status,
      duration: record.duration,
    }).catch((err) => { captureError(err, { service: "import-actions", operation: "importCreator-audit" }); });

    return {
      success: publishResult.success,
      tenantId: provisionResult.tenantId,
      storefrontUrl: provisionResult.storefrontUrl,
      status,
      record,
      error: publishResult.success ? undefined : `Publishing failed: ${publishResult.error}`,
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
