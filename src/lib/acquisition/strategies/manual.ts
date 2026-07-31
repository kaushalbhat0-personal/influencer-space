import type { CreatorAcquisitionAdapter, AcquisitionResult } from "@/lib/acquisition/types";
import type { BusinessProfile } from "@/lib/acquisition/business-types";
import { User } from "lucide-react";

export class ManualAcquisitionAdapter implements CreatorAcquisitionAdapter {
  id = "manual" as const;
  label = "Manual Setup";
  description = "Enter your business details step by step";
  icon = User;
  requiresManualReview = false;
  typicalConfidence = 90;

  validate(input: string): { valid: boolean; error?: string } {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, error: "Name is required." };
    if (trimmed.length < 2) return { valid: false, error: "Name must be at least 2 characters." };
    return { valid: true };
  }

  async acquire(input: string): Promise<AcquisitionResult> {
    const name = input.trim();
    return {
      strategy: "manual",
      rawInput: input,
      confidence: 90,
      completeness: 60,
      warnings: [],
      requiresManualReview: false,
      profile: {
        businessName: name, ownerName: name,
        category: "", industry: "",
        tagline: "", description: "", audience: "", goals: "", tone: "",
        offers: [],
        socialLinks: [],
        palette: { primary: "#6366f1", secondary: "#a78bfa" },
        pages: ["home", "products", "about", "contact"],
      } as BusinessProfile,
    };
  }
}
