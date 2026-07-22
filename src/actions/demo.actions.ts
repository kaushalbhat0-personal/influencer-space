"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEMO_SEEDS } from "@/lib/demo/seeds";
import { provisioningEngine, CreatorProvisioningEngine } from "@/lib/provisioning/engine";
import { QualityGate } from "@/lib/provisioning/quality-gate";
import type { DemoGenerationResult } from "@/lib/demo/types";

export async function generateDemoWebsite(seedId: string): Promise<DemoGenerationResult> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { seedId, status: "failed", tenantId: "", storefrontUrl: "", productCount: 0, seedVersion: "1.0", generatorVersion: "1.0", generatedAt: "", generatedBy: "", error: "Unauthorized" };
  }

  const seed = DEMO_SEEDS.find((s) => s.id === seedId);
  if (!seed) {
    return { seedId, status: "failed", tenantId: "", storefrontUrl: "", productCount: 0, seedVersion: "1.0", generatorVersion: "1.0", generatedAt: "", generatedBy: "", error: "Seed not found" };
  }

  // Step 1: Provision inside a transaction
  const profile = CreatorProvisioningEngine.fromSeed(seed);
  const result = await provisioningEngine.provision(profile, session.user.id ?? "");

  if (!result.success) {
    return {
      seedId, status: "failed",
      tenantId: result.tenantId, storefrontUrl: result.storefrontUrl,
      productCount: result.productCount,
      seedVersion: "1.0", generatorVersion: "1.0",
      generatedAt: new Date().toISOString(), generatedBy: session.user.id ?? "",
      error: result.errors.join(", "),
    };
  }

  // Step 2: Run quality gate
  const qualityReport = await QualityGate.run(result.tenantId);

  // Step 3: If quality < 100%, stay draft; otherwise published
  const status = qualityReport.published ? "published" : "failed";
  const error = qualityReport.published ? undefined : `Quality score ${qualityReport.score}% — ${qualityReport.checks.filter((c) => !c.passed).map((c) => c.label).join(", ")}`;

  return {
    seedId, status,
    tenantId: result.tenantId, storefrontUrl: result.storefrontUrl,
    productCount: result.productCount,
    seedVersion: "1.0", generatorVersion: "1.0",
    generatedAt: new Date().toISOString(), generatedBy: session.user.id ?? "",
    error,
  };
}
