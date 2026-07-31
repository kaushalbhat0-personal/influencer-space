import { acquisitionRegistry } from "./registry";
import { YouTubeAcquisitionAdapter } from "./strategies/youtube";
import { ManualAcquisitionAdapter } from "./strategies/manual";
import { DemoSeedAcquisitionAdapter } from "./strategies/demo-seed";
import { GoogleBusinessAcquisitionAdapter } from "./strategies/google-business";

acquisitionRegistry.register(new YouTubeAcquisitionAdapter());
acquisitionRegistry.register(new ManualAcquisitionAdapter());
acquisitionRegistry.register(new DemoSeedAcquisitionAdapter());
acquisitionRegistry.register(new GoogleBusinessAcquisitionAdapter());

export { acquisitionRegistry } from "./registry";
export { YouTubeAcquisitionAdapter } from "./strategies/youtube";
export { ManualAcquisitionAdapter } from "./strategies/manual";
export { DemoSeedAcquisitionAdapter } from "./strategies/demo-seed";
export { GoogleBusinessAcquisitionAdapter } from "./strategies/google-business";
export type {
  CreatorAcquisitionAdapter,
  AcquisitionResult,
  AcquisitionStrategy,
  AcquisitionRecord,
  AcquisitionProvisionResult,
  CreatorProfile,
} from "./types";
