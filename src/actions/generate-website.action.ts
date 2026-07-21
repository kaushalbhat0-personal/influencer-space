"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { websiteGenerationPipeline } from "@/lib/ai-generation/pipeline";
import type { GenerationInput, WebsiteGenerationResult } from "@/lib/ai-generation/types";

export interface GenerateWebsiteInput {
  source: string;
  template?: string;
  strategy?: "fast" | "balanced" | "premium";
  skipAI?: boolean;
  forceTheme?: string;
  adminEmail?: string;
  subdomain?: string;
  sections?: string[];
}

export async function generateWebsite(
  input: GenerateWebsiteInput
): Promise<{ success: boolean; data?: WebsiteGenerationResult; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "AGENCY_ADMIN") {
      return { success: false, error: "Forbidden" };
    }

    const pipelineInput: GenerationInput = {
      source: input.source,
      options: {
        skipAI: input.skipAI ?? input.strategy === "fast",
        forceTheme: input.forceTheme,
        adminEmail: input.adminEmail,
        subdomain: input.subdomain,
      },
    };

    const result = await websiteGenerationPipeline.execute(pipelineInput);

    return { success: result.success, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Generation failed",
    };
  }
}
