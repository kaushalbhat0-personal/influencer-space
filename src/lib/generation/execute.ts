import { prisma } from "@/lib/prisma";
import { onboardingService } from "@/lib/onboarding/service";
import { sessionService } from "@/lib/generation/session";
import { provisioningService } from "@/modules/provisioning/application/provisioning-service";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import { publishingService } from "@/lib/publishing/service";
import { buildProvisioningInput, buildBuilderArtifactData, detectPlatform } from "@/lib/generation/integration/provision-pipeline";
import { applyGoalSectionPriority } from "@/modules/goals-runtime";
import { goldenDataset, GoldenValidator } from "@/lib/generation/golden";
import { platformEventBus } from "@/lib/events";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";
import { metricsService } from "@/lib/observability/metrics-service";
import { applyBlueprintToWebsite } from "@/actions/create.actions";
import { writeOnboardingComplete } from "@/lib/onboarding/complete";

export interface ExecuteGenerationInput {
  sessionId: string;
  sourceUrl: string;
  workspaceName?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  categoryOverride?: string;
  goals?: Array<{ goalId: string; weight: number }>;
  userId: string;
  creatorName?: string;
  existingProfileResult?: Awaited<ReturnType<typeof onboardingService.importProfile>> | null;
}

export async function executeGenerationPipeline(input: ExecuteGenerationInput): Promise<{ success: boolean; error?: string; retryable?: boolean; tenantId?: string; result?: unknown }> {
  const { sessionId, sourceUrl, workspaceName = "My Storefront", timezone = "Asia/Kolkata", currency = "INR", language = "en", categoryOverride, goals, userId, creatorName: inputCreatorName } = input;
  const session = await prisma.generationSession.findUnique({ where: { id: sessionId } });
  if (!session) return { success: false, error: "Session not found" };
  const creatorName = inputCreatorName || session.creatorName || "Creator";

  const stages: Array<{ stage: string; status: string; error?: string }> = [];
  const markStage = (stage: string, status: string, error?: string) => stages.push({ stage, status, error });

  markStage("profile_import", "running");
  let progressStage: string | null = null;
  const onImportProgress = async (stage: string) => {
    if (progressStage && progressStage !== stage) {
      await sessionService.updateStage(sessionId, progressStage as never, "completed").catch(()=>{});
    }
    progressStage = stage;
    await sessionService.updateStage(sessionId, stage as never, "running").catch(()=>{});
  };

  let profileResult: Awaited<ReturnType<typeof onboardingService.importProfile>>;
  try {
    profileResult = input.existingProfileResult ?? await onboardingService.importProfile(sourceUrl, userId, creatorName, onImportProgress as never);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sessionService.updateStage(sessionId, "import_profile", "failed", msg).catch(()=>{});
    await sessionService.fail(sessionId, msg).catch(()=>{});
    return { success: false, error: msg, retryable: true };
  }
  markStage("profile_import", "completed");
  if (progressStage) {
    await sessionService.updateStage(sessionId, progressStage as never, "completed").catch(()=>{});
  } else {
    await sessionService.updateStage(sessionId, "import_profile", "completed").catch(()=>{});
  }
  await sessionService.updateStage(sessionId, "knowledge_intelligence", "completed").catch(()=>{});
  await sessionService.updateStage(sessionId, "persona_detection", "completed").catch(()=>{});
  const { emitGenerationEvent } = await import("@/modules/generation-progress");
  await emitGenerationEvent(sessionId, "generation.profile.imported", { creatorName }).catch(()=>{});

  const acq = profileResult.acquisition as { capabilities?: string[]; populatedFields?: string[] } | undefined;
  if (acq?.populatedFields?.length) {
    await sessionService.recordActivity(sessionId, `Extracted your profile (${acq.populatedFields.length} fields)`).catch(()=>{});
  }
  if (profileResult.personaMatch?.persona?.name) {
    await sessionService.recordActivity(sessionId, `Detected "${profileResult.personaMatch.persona.name}" persona`).catch(()=>{});
  }

  let goldenValidationResult = null;
  if (goldenDataset.isKnownUrl(sourceUrl)) {
    goldenValidationResult = new GoldenValidator().validateByUrl(sourceUrl, profileResult.experienceProfile);
  }

  markStage("generation", "running");
  await sessionService.updateStage(sessionId, "planning_context", "running").catch(()=>{});

  const diag = (profileResult as unknown as { diagnostics?: { hasResumeSource?: boolean; hasComposition?: boolean; hasBlueprint?: boolean } }).diagnostics ?? null;
  const resumeFlag = diag ? (diag as { hasResumeSource?: boolean }).hasResumeSource : false;
  if (resumeFlag && (!profileResult.composition || !profileResult.blueprint)) {
    const errMsg = `Intelligent composition unavailable for resume source (hasResumeSource=true hasComposition=${!!profileResult.composition} hasBlueprint=${!!profileResult.blueprint}). Please retry generation.`;
    await sessionService.updateStage(sessionId, "composition", "failed", errMsg).catch(()=>{});
    await sessionService.fail(sessionId, errMsg).catch(()=>{});
    await emitGenerationEvent(sessionId, "generation.failed", { stage: "composition", error: errMsg }).catch(()=>{});
    return { success: false, error: errMsg, retryable: true };
  }

  const genStart = Date.now();
  let generateResult: Awaited<ReturnType<typeof onboardingService.generate>> | null = null;
  let intelligentBuilderArtifact: ReturnType<typeof buildBuilderArtifactData> | null = null;
  let intelligentCompositionForBuilder: typeof profileResult.composition | null = null;
  if (profileResult.composition && profileResult.blueprint) {
    intelligentCompositionForBuilder = profileResult.composition;
    intelligentBuilderArtifact = {
      sections: profileResult.composition.builder.artifact.sections,
      navigation: profileResult.composition.builder.artifact.navigation as unknown as Record<string, unknown>,
      theme: profileResult.composition.builder.artifact.theme as unknown as Record<string, unknown>,
      metadata: profileResult.composition.builder.artifact.metadata as unknown as Record<string, unknown>,
    } as ReturnType<typeof buildBuilderArtifactData>;
    generateResult = {
      experiencePlan: null as unknown as Awaited<ReturnType<typeof onboardingService.generate>>["experiencePlan"],
      websiteBlueprint: {
        website: { title: profileResult.composition.publishing.title, tagline: "", description: profileResult.composition.publishing.description, domain: `${profileResult.composition.publishing.subdomain}`, locale: "en-US", currency: "USD", timezone: "UTC", version: 1 },
        pages: [], navigation: { desktop: [], mobile: [], bottom: [], mobileBottom: [], sticky: true, style: "standard" },
        sections: [], products: [], gallery: { enabled: false, albums: [], featuredImages: [], ordering: "chronological", layout: "grid" },
        feed: { enabled: false, source: "", limit: 0, layout: "grid", showCaptions: false, autoplay: false },
        about: null, contact: null, seo: { title: profileResult.composition.seo.title, description: profileResult.composition.seo.description, keywords: profileResult.composition.seo.keywords, ogImage: "", ogType: profileResult.composition.seo.openGraphType, twitterHandle: "", canonical: profileResult.composition.seo.canonical, structuredData: {}, sitemapPriority: 0.5, sitemapChangefreq: "daily" },
        theme: { primary: "", secondary: "", accent: "", background: "", text: "", fonts: { heading: "", body: "" }, spacing: { sectionPadding: "", containerWidth: "", gap: "" }, borderRadius: "", mode: "light" as const, buttons: { borderRadius: "", padding: "", fontWeight: "", textTransform: "none" as const }, cards: { borderRadius: "", shadow: "", padding: "" }, colors: {} },
        builder: profileResult.composition.builder.artifact as unknown as Awaited<ReturnType<typeof onboardingService.generate>>["websiteBlueprint"]["builder"],
        metadata: { generatedAt: new Date().toISOString(), version: 1, confidence: 0.9, sourceKey: sourceUrl, intelligenceVersion: "1.0" },
      },
      artifacts: [],
    };
  } else {
    generateResult = await onboardingService.generate(profileResult.knowledgeGraph, profileResult.experienceProfile);
  }
  if (!generateResult) {
    generateResult = await onboardingService.generate(profileResult.knowledgeGraph, profileResult.experienceProfile);
  }
  metricsService.recordDuration("generation", Date.now() - genStart, { sourcePlatform: profileResult.platform ?? "unknown" });
  markStage("generation", "completed");
  await sessionService.updateStage(sessionId, "planning_context", "completed").catch(()=>{});
  await sessionService.updateStage(sessionId, "experience_planning", "completed").catch(()=>{});
  await sessionService.updateStage(sessionId, "composition", "completed").catch(()=>{});
  await sessionService.updateStage(sessionId, "artifact_generation", "completed").catch(()=>{});

  const effectiveCreatorName = profileResult.knowledgeGraph.creator.name?.trim() || creatorName;
  const sourcePlatform = profileResult.platform;
  const runId = await provisioningService.createRun({ creatorName: effectiveCreatorName, sourceUrl, sourcePlatform });
  const pipelineResult = {
    generationResult: undefined as never,
    knowledgeGraph: profileResult.knowledgeGraph,
    blueprint: generateResult.websiteBlueprint,
    artifacts: generateResult.artifacts,
    provisioned: true,
    snapshotId: null,
    storefrontUrl: null,
    version: 1,
  };
  markStage("provisioning", "running");
  await sessionService.updateStage(sessionId, "provisioning", "running").catch(()=>{});

  // Idempotent tenant reuse
  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
  const existingTenantId = dbUser?.tenantId ?? null;
  const existingWebsite = existingTenantId ? await prisma.website.findUnique({ where: { tenantId: existingTenantId }, select: { id: true, tenant: { select: { subdomain: true, customDomain: true } } } }) : null;
  let provisioned: { success: boolean; tenantId: string; websiteId: string; workspaceId?: string; storefrontUrl: string; dashboardUrl: string };
  if (existingTenantId && existingWebsite) {
    const ws = await workspaceRepository.findByTenantId(existingTenantId);
    const storefrontUrl = existingWebsite.tenant?.customDomain ? `https://${existingWebsite.tenant.customDomain}` : existingWebsite.tenant?.subdomain ? `/${existingWebsite.tenant.subdomain}` : `/`;
    provisioned = { success: true, tenantId: existingTenantId, websiteId: existingWebsite.id, workspaceId: ws?.id ?? existingTenantId, storefrontUrl, dashboardUrl: "/admin/dashboard", runId } as never;
    markStage("provisioning", "completed");
    await sessionService.recordActivity(sessionId, "Reusing your existing workspace").catch(()=>{});
    const { BuilderService } = await import("@/lib/builder/builder-service");
    const existingPages = await new BuilderService().load(existingWebsite.id);
    if (!existingPages || existingPages.length === 0) {
      const { storefrontToBuilderPages } = await import("@/lib/builder/artifact-loader");
      const reuseBuilderData = intelligentBuilderArtifact ?? buildBuilderArtifactData(pipelineResult);
      const generatedSections = (reuseBuilderData?.sections as Array<{ id: string; type: string; props: Record<string, unknown> }> | undefined) ?? [];
      if (generatedSections.length > 0) {
        const builderPages = storefrontToBuilderPages({ sections: generatedSections, navigation: reuseBuilderData?.navigation as Record<string, unknown> | undefined });
        if (builderPages.length > 0) await new BuilderService().save(existingWebsite.id, builderPages);
      }
    }
  } else {
    const provisioningInput: Record<string, unknown> = buildProvisioningInput({
      runId,
      authenticatedUserId: userId,
      creatorName: effectiveCreatorName,
      sourceUrl,
      sourcePlatform,
      avatarUrl: (profileResult as unknown as { channelMeta?: { thumbnailUrl?: string } }).channelMeta?.thumbnailUrl,
      planCode: "creator_launch",
      pipelineResult: pipelineResult as never,
      category: categoryOverride || profileResult.knowledgeGraph.creator.niche,
      industry: categoryOverride || profileResult.knowledgeGraph.creator.niche,
    } as never) as unknown as Record<string, unknown>;
    if (intelligentBuilderArtifact) {
      (provisioningInput as Record<string, unknown>).generatedWebsite = {
        sections: (intelligentBuilderArtifact as unknown as { sections: unknown }).sections,
        navigation: (intelligentBuilderArtifact as unknown as { navigation: unknown }).navigation,
        theme: (intelligentBuilderArtifact as unknown as { theme: unknown }).theme,
        metadata: (intelligentBuilderArtifact as unknown as { metadata: unknown }).metadata,
      };
    }
    try {
      provisioned = await provisioningService.provision(provisioningInput as never) as never;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Provisioning failed";
      markStage("provisioning", "failed", msg);
      await sessionService.fail(sessionId, msg).catch(()=>{});
      const { emitGenerationEvent: emit } = await import("@/modules/generation-progress");
      await emit(sessionId, "generation.failed", { stage: "provisioning", error: msg }).catch(()=>{});
      return { success: false, error: msg, retryable: false };
    }
    markStage("provisioning", "completed");
  }
  await sessionService.updateStage(sessionId, "provisioning", "completed").catch(()=>{});
  await sessionService.updateProgress(sessionId, { status: "publishing", currentStage: "publishing", storefrontUrl: provisioned.storefrontUrl }).catch(()=>{});
  await sessionService.recordActivity(sessionId, "Created your workspace").catch(()=>{});
  const ws = await workspaceRepository.findByTenantId(provisioned.tenantId);
  const resolvedWorkspaceId = ws?.id;
  if (resolvedWorkspaceId) {
    await sessionService.updateProgress(sessionId, { currentStage: "publishing" }).catch(()=>{});
    const { sessionRegistry } = await import("@/lib/generation/session");
    await sessionRegistry.update(sessionId, { workspaceId: resolvedWorkspaceId }).catch(()=>{});
  }
  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: provisioned.tenantId, key: "onboarding_source" } },
    update: { value: JSON.parse(JSON.stringify({ sourceUrl, sourcePlatform, workspaceName, timezone, currency, language, completedAt: new Date().toISOString() })) },
    create: { tenantId: provisioned.tenantId, key: "onboarding_source", value: JSON.parse(JSON.stringify({ sourceUrl, sourcePlatform, workspaceName, timezone, currency, language, completedAt: new Date().toISOString() })) },
  });
  if (intelligentCompositionForBuilder && provisioned?.websiteId) {
    const intelligentThemeId = intelligentCompositionForBuilder.theme.themeId;
    if (intelligentThemeId) {
      try { await prisma.website.update({ where: { id: provisioned.websiteId }, data: { themePackageId: intelligentThemeId } }); } catch {}
    }
  }
  markStage("builder_init", "running");
  let builderData: ReturnType<typeof buildBuilderArtifactData> = intelligentBuilderArtifact ?? buildBuilderArtifactData(pipelineResult);
  if (intelligentBuilderArtifact && profileResult.composition) builderData = intelligentBuilderArtifact;
  try {
    const { applySectionPresets } = await import("@/modules/section-presentation");
    const category = categoryOverride || profileResult.knowledgeGraph.creator.niche || "default";
    const sections = (builderData?.sections as Array<{ type: string; props: Record<string, unknown> }> | undefined) ?? [];
    for (const section of sections) if (!section.props) section.props = {};
    applySectionPresets(category, sections.map((s) => ({ baseId: s.type, config: s.props })));
  } catch {}
  if (builderData && goals && goals.length > 0) {
    const sections = (builderData.sections as Array<{ type: string }> | undefined) ?? [];
    builderData = { ...builderData, sections: applyGoalSectionPriority(sections, { weights: goals.map((g) => ({ goalId: g.goalId, weight: g.weight })) as never, updatedAt: new Date().toISOString(), source: "recommended", entityType: "" }) };
  }
  if (builderData) {
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId: provisioned.tenantId, key: "builder_artifact" } },
      update: { value: JSON.parse(JSON.stringify(builderData)) },
      create: { tenantId: provisioned.tenantId, key: "builder_artifact", value: JSON.parse(JSON.stringify(builderData)) },
    });
  }
  if (builderData && provisioned?.websiteId) {
    try {
      const sections = (builderData.sections as Array<{ id?: string; type: string; props: Record<string, unknown> }> | undefined) ?? [];
      if (sections.length > 0) {
        const { BuilderService } = await import("@/lib/builder/builder-service");
        const builderService = new BuilderService();
        const existing = await builderService.load(provisioned.websiteId);
        const shouldOverwrite = !!intelligentBuilderArtifact || existing.length === 0;
        if (shouldOverwrite) {
          const { storefrontToBuilderPages } = await import("@/lib/builder/artifact-loader");
          const builderPages = storefrontToBuilderPages({
            sections: sections.map((s) => ({ id: s.id ?? s.type, type: s.type, props: s.props ?? {} })) as never,
            navigation: (builderData as Record<string, unknown>).navigation as Record<string, unknown> | undefined,
          });
          if (builderPages.length > 0) await builderService.save(provisioned.websiteId, builderPages);
        }
      }
    } catch {}
  }
  markStage("builder_init", "completed");
  markStage("publishing", "running");
  await sessionService.updateStage(sessionId, "publishing", "running").catch(()=>{});
  await emitGenerationEvent(sessionId, "generation.publish.started", { tenantId: provisioned.tenantId }).catch(()=>{});
  if (provisioned) {
    try {
      const { publishingService: pub } = await import("@/lib/publishing/service");
      const publishResult = await pub.publish(provisioned.tenantId);
      if (!publishResult.success) throw new Error(publishResult.error ?? "Publishing failed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Publishing failed";
      captureError(err, { service: "onboarding-actions", operation: "publish", tenantId: provisioned.tenantId });
      markStage("publishing", "failed", msg);
      await sessionService.updateStage(sessionId, "publishing", "failed", msg).catch(()=>{});
      await sessionService.fail(sessionId, msg).catch(()=>{});
      await emitGenerationEvent(sessionId, "generation.failed", { stage: "publishing", error: msg }).catch(()=>{});
      return { success: false, error: msg, retryable: true, tenantId: provisioned.tenantId };
    }
  }
  markStage("publishing", "completed");
  await sessionService.updateStage(sessionId, "publishing", "completed").catch(()=>{});
  await sessionService.recordActivity(sessionId, "Published your website").catch(()=>{});
  try { await writeOnboardingComplete(provisioned.tenantId); } catch {}
  const website = await prisma.website.findUnique({ where: { tenantId: provisioned.tenantId }, select: { id: true } });
  const goldenValidationOutput = goldenDataset.isKnownUrl(sourceUrl) ? new GoldenValidator().validateByUrl(sourceUrl, profileResult.experienceProfile) : null;
  const goldenOut = goldenValidationOutput ? { passed: goldenValidationOutput.passed, overallScore: goldenValidationOutput.overallScore, regressions: goldenValidationOutput.regressions } : null;
  await sessionService.updateStage(sessionId, "golden_validation", "completed").catch(()=>{});
  await sessionService.complete(sessionId, {
    evaluationScore: profileResult.experienceProfile.confidence,
    goldenValidationScore: goldenValidationOutput?.overallScore ?? undefined,
    storefrontUrl: provisioned.storefrontUrl,
    builderUrl: website ? "/builder" : undefined,
    dashboardUrl: website ? "/builder" : "/admin/dashboard",
  }).catch(()=>{});
  await emitGenerationEvent(sessionId, "generation.publish.completed", { tenantId: provisioned.tenantId }).catch(()=>{});
  await emitGenerationEvent(sessionId, "generation.dashboard.ready", { tenantId: provisioned.tenantId }).catch(()=>{});
  await emitGenerationEvent(sessionId, "generation.completed", { tenantId: provisioned.tenantId }).catch(()=>{});
  return { success: true, result: { tenantId: provisioned.tenantId, workspaceId: resolvedWorkspaceId, storefrontUrl: provisioned.storefrontUrl, dashboardUrl: website ? "/builder" : "/admin/dashboard" }, tenantId: provisioned.tenantId };
}
