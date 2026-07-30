import type { BusinessProfile } from "./business-types";

const DRAFT_KEY_PREFIX = "acq_draft_";

export function saveDraft(strategy: string, profile: BusinessProfile): void {
  try {
    const key = `${DRAFT_KEY_PREFIX}${strategy}`;
    const data = { profile, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function loadDraft(strategy: string): BusinessProfile | null {
  try {
    const key = `${DRAFT_KEY_PREFIX}${strategy}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as { profile: BusinessProfile; savedAt: number };
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - data.savedAt > oneDay) {
      localStorage.removeItem(key);
      return null;
    }
    return data.profile;
  } catch {
    return null;
  }
}

export function clearDraft(strategy: string): void {
  try {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${strategy}`);
  } catch {
    // ignore
  }
}
