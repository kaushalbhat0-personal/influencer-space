import type { BuilderPage, BuilderSection, BuilderSlot } from "@/lib/builder/types";

export function validatePage(page: Partial<BuilderPage>): string[] {
  const errors: string[] = [];
  if (!page.id) errors.push("Page id is required");
  if (!page.name) errors.push("Page name is required");
  if (!page.slug) errors.push("Page slug is required");
  return errors;
}

export function validateSection(section: Partial<BuilderSection>): string[] {
  const errors: string[] = [];
  if (!section.id) errors.push("Section id is required");
  if (!section.name) errors.push("Section name is required");
  return errors;
}

export function validateSlot(slot: Partial<BuilderSlot>): string[] {
  const errors: string[] = [];
  if (!slot.id) errors.push("Slot id is required");
  if (!slot.moduleId) errors.push("Slot moduleId is required");
  return errors;
}

export function validateBeforeSave(pages: BuilderPage[]): string[] {
  const errors: string[] = [];
  for (const page of pages) {
    errors.push(...validatePage(page).map((e) => `Page "${page.name}": ${e}`));
    for (const section of page.sections) {
      errors.push(...validateSection(section).map((e) => `Section "${section.name}" in page "${page.name}": ${e}`));
      for (const slot of section.slots) {
        errors.push(...validateSlot(slot).map((e) => `Slot in section "${section.name}": ${e}`));
      }
    }
  }
  return errors;
}
