/**
 * @deprecated Use @/actions/acquisition/acquire.actions instead.
 * These functions delegate to the new acquisition layer.
 */

import { executeStrategy, acquireAndProvision } from "@/actions/acquisition/acquire.actions";
import type { AcquisitionStrategy as ImportSource } from "@/lib/acquisition/types";
import type { AcquisitionResult as ImportAnalysisResult } from "@/lib/acquisition/types";
import type { AcquisitionProvisionResult as ImportResult } from "@/lib/acquisition/types";
import type { AcquisitionRecord as ImportRecord } from "@/lib/acquisition/types";
import type { CreatorProfile } from "@/lib/acquisition/types";

export async function analyzeCreatorImport(source: ImportSource, input: string): Promise<ImportAnalysisResult> {
  return executeStrategy(source, input);
}

export async function importCreator(
  source: ImportSource,
  input: string,
  profile: CreatorProfile,
): Promise<ImportResult> {
  return acquireAndProvision(source, input, profile);
}
