"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DemoSeedAdapter } from "@/lib/import/adapters/demo-seed";
import { provisioningEngine } from "@/lib/provisioning/engine";
import { QualityGate } from "@/lib/provisioning/quality-gate";
import { track } from "@/lib/analytics";
import type { DemoGenerationResult } from "@/lib/demo/types";

const demoSeedAdapter = new DemoSeedAdapter();

export async function generateDemoWebsite(seedId: string): Promise<DemoGenerationResult> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { seedId, status: "failed", tenantId: "", storefrontUrl: "", productCount: 0, seedVersion: "1.0", generatorVersion: "1.0", generatedAt: "", generatedBy: "", error: "Unauthorized" };
  }

  const validation = demoSeedAdapter.validate(seedId);
  if (!validation.valid) {
    return { seedId, status: "failed", tenantId: "", storefrontUrl: "", productCount: 0, seedVersion: "1.0", generatorVersion: "1.0", generatedAt: "", generatedBy: "", error: validation.error || "Invalid seed" };
  }

  const analysis = await demoSeedAdapter.analyze(seedId);
  const profile = analysis.creatorProfile;

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

  const qualityReport = await QualityGate.run(result.tenantId);
  const status = qualityReport.published ? "published" : "failed";
  const error = qualityReport.published ? undefined : `Quality score ${qualityReport.score}% — ${qualityReport.checks.filter((c) => !c.passed).map((c) => c.label).join(", ")}`;

  track("publish:completed", { source: "demo_seed", status, seedId });

  return {
    seedId, status,
    tenantId: result.tenantId, storefrontUrl: result.storefrontUrl,
    productCount: result.productCount,
    seedVersion: "1.0", generatorVersion: "1.0",
    generatedAt: new Date().toISOString(), generatedBy: session.user.id ?? "",
    error,
  };
}
