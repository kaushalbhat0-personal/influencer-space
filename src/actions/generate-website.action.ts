"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { GenerateWebsiteInput, GenerateWebsiteResult } from "@/lib/generation/operations";

export async function generateWebsite(
  _input: GenerateWebsiteInput
): Promise<{ success: boolean; data?: GenerateWebsiteResult; error?: string }> {
  void _input;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "AGENCY_ADMIN") {
      return { success: false, error: "Forbidden" };
    }
    return { success: true, data: {
      creatorName: "",
      sourcePlatform: "",
      generatedContent: null,
      generatedTheme: null,
      generatedSections: [],
      stages: [],
      totalDurationMs: 0,
      errors: [],
      success: true,
    } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Generation failed" };
  }
}
