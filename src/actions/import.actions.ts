/**
 * @deprecated Use @/actions/acquisition/acquire.actions instead.
 */

import { executeStrategy, acquireAndProvision } from "@/actions/acquisition/acquire.actions";
import type { AcquisitionStrategy } from "@/lib/acquisition/types";
import type { CreatorProfile } from "@/lib/acquisition/types";

export async function analyzeCreatorImport(source: AcquisitionStrategy, input: string) {
  return executeStrategy(source, input);
}

export async function importCreator(
  source: AcquisitionStrategy,
  input: string,
  profile: CreatorProfile,
) {
  return acquireAndProvision(source, input, profile);
}
