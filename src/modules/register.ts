import { registryFacade } from "@/lib/registry/facade";
import { platformBootstrap } from "@/lib/platform/bootstrap";
import type { ModuleDefinition } from "@/lib/module/types";
import { contentAPI } from "@/lib/content/api";
import { productRegistration } from "@/lib/content/entities/product/manifest";
import { heroModule } from "./hero/definition";
import { productsModule } from "./products/definition";
import {
  galleryModule,
  timelineModule,
  contentFeedModule,
  profileModule,
  affiliateLinksModule,
  gamesModule,
  contactModule,
} from "./definitions";

const PLATFORM_MODULES: ModuleDefinition[] = [
  heroModule,
  productsModule,
  galleryModule,
  timelineModule,
  contentFeedModule,
  profileModule,
  affiliateLinksModule,
  gamesModule,
  contactModule,
];

export function registerAllModules(): {
  registered: number;
  failed: { id: string; errors: string[] }[];
} {
  let registered = 0;
  const failed: { id: string; errors: string[] }[] = [];

  for (const def of PLATFORM_MODULES) {
    const result = registryFacade.module.register(def, "platform");
    if (result.success) {
      registered++;
    } else {
      failed.push({
        id: def.identity.id,
        errors: result.errors.map((e) => e.message),
      });
    }
  }

  return { registered, failed };
}

function registerContentModules(): void {
  contentAPI.registerModule(productRegistration);
}

platformBootstrap.onStartup(() => {
  registerContentModules();

  const result = registerAllModules();
  console.log(
    `[Modules] Registered ${result.registered}/${PLATFORM_MODULES.length} platform modules` +
    (result.failed.length > 0 ? ` (${result.failed.length} failed)` : "")
  );
});

export { PLATFORM_MODULES };
