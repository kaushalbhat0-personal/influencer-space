// ── Communication — Template Runtime ────────────────────────
// RCCF-TRACK-02 Phase 15. Renders {{variable}} templates. No HTML in business
// logic; every email/notification is template-driven and localization-ready.

export function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = data[key];
    if (value === undefined || value === null) return match;
    return String(value);
  });
}

export function validateTemplate(template: string, data: Record<string, unknown>): string[] {
  const missing: string[] = [];
  const re = /\{\{(\w+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    if (data[m[1]] === undefined || data[m[1]] === null) missing.push(m[1]);
  }
  return missing;
}
