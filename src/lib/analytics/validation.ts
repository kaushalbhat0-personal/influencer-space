import type { DatePreset } from "./date";
import { DATE_RANGE_PRESETS } from "./date";

export function validateDatePreset(value: string): DatePreset | null {
  if (DATE_RANGE_PRESETS.some((p) => p.value === value)) {
    return value as DatePreset;
  }
  return null;
}

export function validateTenantId(id: string): boolean {
  return typeof id === "string" && id.length > 0 && id.length <= 64;
}

export function validateNonEmpty(value: string, maxLength = 256): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}
