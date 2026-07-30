/**
 * @deprecated Import from @/lib/acquisition instead.
 * Use acquisitionRegistry.get() / acquisitionRegistry.getAll().
 * This module will be removed in a future release.
 */

import { acquisitionRegistry } from "@/lib/acquisition/registry";
import type { AcquisitionStrategy as ImportSource } from "@/lib/acquisition/types";
import type { CreatorAcquisitionAdapter as CreatorImportAdapter } from "@/lib/acquisition/types";

export function getAdapter(source: ImportSource): CreatorImportAdapter | undefined {
  return acquisitionRegistry.get(source) as CreatorImportAdapter | undefined;
}

export function getAllAdapters(): CreatorImportAdapter[] {
  return acquisitionRegistry.getAll() as CreatorImportAdapter[];
}

export { YouTubeAcquisitionAdapter as YouTubeAdapter } from "@/lib/acquisition/strategies/youtube";
export { ManualAcquisitionAdapter as ManualAdapter } from "@/lib/acquisition/strategies/manual";
export { DemoSeedAcquisitionAdapter as DemoSeedAdapter } from "@/lib/acquisition/strategies/demo-seed";
