import type { ModuleDefinition } from "@/lib/module/types";

const defMeta = { displayName: "", icon: "Box", category: "", description: "", defaultProps: {}, propertySchema: [], capabilities: { draggable: true, duplicatable: true, deletable: true, editable: true, resizable: false, copyable: true }, tags: [] };

const base = (id: string, name: string, category: string, tags: string[]): Partial<ModuleDefinition> => ({
  identity: { id, name, version: "1.0.0" as const, domain: "content" as const, description: `${name} module`, author: { type: "platform" as const, id: "com.creatos", name: "CreatorOS" }, icon: "Box", category, tags },
  composition: { capabilities: [], serviceContracts: [], dependencies: [] },
  surfaces: {
    supported: [{ surfaceId: "website" as const, rendererPath: "", interactive: false, streaming: false, cacheable: true }],
    dataLoaderPath: `@/modules/${name.toLowerCase().replace(/\s/g, "-")}/data-loader#${name.toLowerCase().replace(/\s/g, "")}DataLoader`,
    defaultSurface: "website" as const,
  },
  configuration: { schema: {}, defaults: {}, settingsKey: `module_config:${id}`, overridableByCreator: [], lockedByTheme: [] },
  theme: { tokensConsumed: ["color.text.primary", "spacing.4", "radius.md"], variantSlots: [] },
  ai: { contextProviderPath: "", aiCapabilities: [] },
  permissions: { requiredPlanTiers: ["STARTER", "PRO"], featureFlags: [], agencyPermissions: [], minimumRole: "ADMIN" },
  events: { published: [], subscribed: [] },
  marketplace: { previewImages: [], tags, pricing: { model: "free" as const }, compatibleThemes: ["*"], minPlatformVersion: "1.0.0" as const, changelog: "Initial release", documentationUrl: null },
  metadata: { ...defMeta, displayName: name, category },
  manifest: { id, name, version: "1.0.0" as const, domain: "content" as const, description: `${name} module`, author: { type: "platform" as const, id: "com.creatos", name: "CreatorOS" }, license: "MIT", icon: "Box", category, tags, minPlatformVersion: "1.0.0" as const, pricing: { model: "free" as const }, previewImages: [], documentationUrl: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
});

export const productsModule: ModuleDefinition = {
  ...base("com.creatos.products", "Products", "commerce", ["products", "store", "merch"]),
  identity: { ...base("com.creatos.products", "Products", "commerce", ["products", "store", "merch"]).identity!, domain: "commerce" },
  surfaces: {
    supported: [
      { surfaceId: "website", rendererPath: "@/components/public/ProductGrid#ProductGrid", interactive: false, streaming: false, cacheable: true },
      { surfaceId: "admin_panel", rendererPath: "@/app/admin/products/_components/products-manager#ProductsManager", interactive: true, streaming: false, cacheable: false },
    ],
    dataLoaderPath: "@/modules/products/data-loader#productsDataLoader",
    defaultSurface: "website",
  },
} as ModuleDefinition;
