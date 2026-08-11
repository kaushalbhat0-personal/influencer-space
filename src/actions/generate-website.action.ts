"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { detectPlatform, buildContentSource, runProvisionPipeline } from "@/lib/generation/integration/provision-pipeline";
import type { GenerateWebsiteInput, GenerateWebsiteResult } from "@/lib/generation/operations";

function deriveCreatorName(source: string, fallback?: string | null): string {
  const handle = source.match(/@([a-zA-Z0-9_-]+)/i)?.[1];
  if (handle) return handle.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const last = source.split("/").filter(Boolean).pop();
  if (last && !last.includes(".")) return last.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return fallback ?? "Creator";
}

export async function generateWebsite(
  input: GenerateWebsiteInput
): Promise<{ success: boolean; data?: GenerateWebsiteResult; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "AGENCY_ADMIN") {
      return { success: false, error: "Forbidden" };
    }

    const source = (input.source ?? "").trim();
    if (!source) return { success: false, error: "A source URL or description is required." };

    const started = Date.now();
    const sourcePlatform = detectPlatform(source);
    const creatorName = deriveCreatorName(source, session.user.name);
    const contentSource = buildContentSource(source, sourcePlatform, creatorName);

    const pipelineResult = await runProvisionPipeline(
      { sourceUrl: source, creatorId: session.user.id, creatorName, idempotencyPrefix: "generate", strategy: input.strategy ?? "balanced" },
      contentSource,
    );
    const totalDurationMs = Date.now() - started;

    if (!pipelineResult.blueprint) {
      return {
        success: true,
        data: {
          creatorName,
          sourcePlatform,
          generatedContent: null,
          generatedTheme: null,
          generatedSections: [],
          stages: [],
          totalDurationMs,
          errors: ["Generation produced no output"],
          success: false,
        },
      };
    }

    const bp = pipelineResult.blueprint;
    const theme = bp.theme;
    const heroSection = bp.sections.find((s) => s.type === "hero");

    return {
      success: true,
      data: {
        creatorName,
        sourcePlatform,
        generatedContent: {
          heroTitle: (heroSection?.props?.headline as string) ?? bp.website.title,
          heroSubtitle: (heroSection?.props?.subheadline as string) ?? bp.website.tagline,
          heroCta: (heroSection?.props?.cta as string) ?? "Shop Now",
          aboutSection: ((heroSection?.props as Record<string, unknown>)?.bio as string) ?? "",
          tagline: bp.website.tagline,
          seoTitle: bp.seo.title,
          seoDescription: bp.seo.description,
          keywords: bp.seo.keywords,
        },
        generatedTheme: {
          preset: "custom",
          primaryColor: theme.primary,
          secondaryColor: theme.secondary,
          accentColor: theme.accent,
          fontFamily: theme.fonts.heading,
          layoutDensity: "standard",
          darkMode: theme.mode === "dark",
        },
        generatedSections: bp.sections.map((s) => s.type),
        stages: [
          { stage: "acquisition", status: "completed" },
          { stage: "knowledge", status: "completed" },
          { stage: "persona", status: "completed" },
          { stage: "generation", status: "completed" },
        ],
        totalDurationMs,
        errors: [],
        success: true,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Generation failed" };
  }
}
