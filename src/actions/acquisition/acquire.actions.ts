"use server";

import { prisma } from "@/lib/prisma";
import { acquisitionRegistry } from "@/lib/acquisition";
import { provisioningService } from "@/modules/provisioning/application/provisioning-service";
import { publishingService } from "@/lib/publishing/service";
import { track } from "@/lib/analytics";
import { logAction } from "@/lib/audit";
import { captureError } from "@/lib/observability/error-tracker";
import { markOnboardingComplete } from "@/actions/onboarding.actions";
import type { BusinessProfile } from "@/lib/acquisition/business-types";
import type { AcquisitionStrategy, AcquisitionResult, AcquisitionRecord, AcquisitionProvisionResult } from "@/lib/acquisition/types";

let counter = 0;
function nextId(): string {
  counter++;
  return `acq_${Date.now()}_${counter}`;
}

export async function executeStrategy(strategy: AcquisitionStrategy, input: string): Promise<AcquisitionResult> {
  const adapter = acquisitionRegistry.get(strategy);
  if (!adapter) {
    return {
      strategy,
      rawInput: input,
      confidence: 0,
      completeness: 0,
      warnings: [`Unsupported acquisition strategy: "${strategy}".`],
      requiresManualReview: true,
      profile: {
        businessName: "", ownerName: "", category: "", industry: "",
        tagline: "", description: "", audience: "", goals: "", tone: "",
        offers: [], socialLinks: [],
        palette: { primary: "#6366f1", secondary: "#a78bfa" },
        pages: [],
      },
    };
  }

  const validation = adapter.validate(input);
  if (!validation.valid) {
    return {
      strategy,
      rawInput: input,
      confidence: 0,
      completeness: 0,
      warnings: [validation.error || "Invalid input."],
      requiresManualReview: true,
      profile: {
        businessName: "", ownerName: "", category: "", industry: "",
        tagline: "", description: "", audience: "", goals: "", tone: "",
        offers: [], socialLinks: [],
        palette: { primary: "#6366f1", secondary: "#a78bfa" },
        pages: [],
      },
    };
  }

  track("acquisition:started", { strategy, input });
  const result = await adapter.acquire(input);
  track("acquisition:completed", { strategy, input, confidence: result.confidence, completeness: result.completeness, warningCount: result.warnings.length });
  return result;
}

export async function acquireAndProvision(
  strategy: AcquisitionStrategy,
  input: string,
  profile: BusinessProfile,
): Promise<AcquisitionProvisionResult> {
  const businessName = profile.businessName || profile.ownerName || "Storefront";
  const startedAt = Date.now();
  const recordId = nextId();
  const record: AcquisitionRecord = {
    id: recordId, strategy, input, creatorName: businessName,
    tenantId: "", storefrontUrl: "", status: "started", confidence: 0,
    completeness: 0, warnings: [], duration: 0, errors: [], createdAt: new Date().toISOString(),
  };

  try {
    track("provision:started", { strategy, creatorName: businessName });

    const runId = await provisioningService.createRun({
      creatorName: businessName,
      sourceUrl: input,
      sourcePlatform: strategy,
    });

    const offers = profile.offers || [];

    const provisioningInput = {
      runId,
      creatorName: businessName,
      sourceUrl: input,
      sourcePlatform: strategy,
      generatedContent: {
        heroTitle: profile.tagline || `Welcome to ${businessName}`,
        tagline: profile.tagline,
        aboutSection: profile.description,
        seoTitle: businessName,
        seoDescription: `${businessName} — ${profile.tagline || profile.description?.slice(0, 100) || "Storefront on CreatorStore"}`,
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
      track("provision:completed", { strategy, status: "failed", errors: "Provisioning failed" });
      return { success: false, tenantId: provisionResult.tenantId, storefrontUrl: "", status: "failed", record, error: "Provisioning failed" };
    }

    if (offers.length > 0) {
      for (const o of offers) {
        await prisma.product.create({
          data: {
            tenantId: provisionResult.tenantId,
            name: o.name,
            price: o.price,
            description: o.description,
            isActive: true,
          },
        });
      }
    }

    const publishResult = await publishingService.publish(provisionResult.tenantId);

    record.tenantId = provisionResult.tenantId;
    record.storefrontUrl = provisionResult.storefrontUrl;
    record.status = publishResult.success ? "completed" : "failed";
    record.duration = Date.now() - startedAt;
    record.confidence = publishResult.success ? 100 : 0;
    record.completeness = publishResult.success ? 100 : 0;

    const status = publishResult.success ? "published" : "failed";

    if (publishResult.success) {
      await markOnboardingComplete(provisionResult.tenantId).catch((err) => {
        captureError(err, { service: "acquisition-actions", operation: "markOnboardingComplete" });
      });
    }

    await logAction(provisionResult.tenantId, "acquisition:completed", {
      strategy, recordId, creatorName: businessName, status,
      duration: record.duration,
    }).catch((err) => { captureError(err, { service: "acquisition-actions", operation: "acquireAndProvision-audit" }); });

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
    track("provision:completed", { strategy, status: "failed", error: String(e) });
    return { success: false, tenantId: "", storefrontUrl: "", status: "failed", record, error: String(e) };
  }
}
