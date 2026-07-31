import type { BlueprintRuntime } from "../domain/types";

export interface BuilderPageData {
  id: string;
  name: string;
  slug: string;
  order: number;
  sections: BuilderSectionData[];
}

export interface BuilderSectionData {
  id: string;
  moduleId: string;
  order: number;
  visible: boolean;
  config: Record<string, unknown>;
}

export class BlueprintBuilderAdapter {
  /** Translates resolved runtime into the legacy builder page format. */
  toBuilderPages(runtime: BlueprintRuntime): BuilderPageData[] {
    return runtime.resolved.pages.map((page) => ({
      id: page.id,
      name: page.title,
      slug: page.slug,
      order: runtime.blueprint.pages.indexOf(runtime.blueprint.pages.find((p) => p.id === page.id)!) || 0,
      sections: page.sections.map((section) => ({
        id: section.id,
        moduleId: section.type,
        order: section.order,
        visible: section.visibility === "visible",
        config: section.configuration,
      })),
    }));
  }
}

export const builderAdapter = new BlueprintBuilderAdapter();
