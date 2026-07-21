/**
 * Storefront Section Registry v1.0.0
 *
 * Pluggable section system for generated websites.
 * Each section registers its type, render function, and metadata.
 * The runtime iterates the registry to render pages.
 */

import type { PublicPageData } from "@/services/public.service";
import type { ReactNode } from "react";

export interface SectionDefinition {
  type: string;
  name: string;
  priority: number;
  isVisible: (data: PublicPageData) => boolean;
  render: (data: PublicPageData, tenantId: string) => ReactNode;
}

class SectionRegistry {
  private sections = new Map<string, SectionDefinition>();

  register(definition: SectionDefinition): void {
    this.sections.set(definition.type, definition);
  }

  getAll(): SectionDefinition[] {
    return Array.from(this.sections.values()).sort((a, b) => a.priority - b.priority);
  }

  get(type: string): SectionDefinition | undefined {
    return this.sections.get(type);
  }

  getVisible(data: PublicPageData): SectionDefinition[] {
    return this.getAll().filter((s) => s.isVisible(data));
  }

  get size(): number {
    return this.sections.size;
  }

  listTypes(): string[] {
    return Array.from(this.sections.keys());
  }
}

export const sectionRegistry = new SectionRegistry();
