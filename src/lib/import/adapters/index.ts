import type { CreatorImportAdapter, ImportSource } from "@/lib/import/types";
import { DemoSeedAdapter } from "./demo-seed";
import { ManualAdapter } from "./manual";
import { YouTubeAdapter } from "./youtube";

const registry = new Map<ImportSource, CreatorImportAdapter>();

function register(adapter: CreatorImportAdapter) {
  registry.set(adapter.source, adapter);
}

register(new DemoSeedAdapter());
register(new ManualAdapter());
register(new YouTubeAdapter());

export function getAdapter(source: ImportSource): CreatorImportAdapter | undefined {
  return registry.get(source);
}

export function getAllAdapters(): CreatorImportAdapter[] {
  return Array.from(registry.values());
}

export { DemoSeedAdapter, ManualAdapter, YouTubeAdapter };
