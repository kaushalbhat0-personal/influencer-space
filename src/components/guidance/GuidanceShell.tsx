"use client";
import { GuidanceWalkthrough } from "./GuidanceWalkthrough";
import { HelpButton } from "./HelpButton";
import { CREATOR_GUIDANCE, AGENCY_GUIDANCE } from "@/lib/guidance/definitions";
import type { GuidanceAudience } from "@/lib/guidance/types";

export function GuidanceShell({ audience, helpContext }: { audience: GuidanceAudience; helpContext?: string }) {
  const def = audience === "agency" ? AGENCY_GUIDANCE : CREATOR_GUIDANCE;
  return (
    <>
      <GuidanceWalkthrough definition={def} />
      <HelpButton context={helpContext ?? def.steps[0]?.title} />
    </>
  );
}
