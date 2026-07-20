import type { ThemeToken, ThemeTokenGroup, ThemeDefinition, ThemeQuery, TokenCategory } from "./types";
import { builderEvents } from "../events";
import { platformTelemetry } from "@/lib/telemetry/telemetry";
import { themeTransaction } from "./transaction";

export class ThemeRegistry {
  private groups = new Map<string, ThemeTokenGroup>();
  private tokens = new Map<string, ThemeToken>();
  private theme: ThemeDefinition | null = null;

  load(theme: ThemeDefinition): void {
    this.groups.clear();
    this.tokens.clear();
    this.theme = JSON.parse(JSON.stringify(theme)) as ThemeDefinition;

    for (const group of this.theme.groups) {
      this.groups.set(group.id, group);
      for (const token of group.tokens) {
        this.tokens.set(token.key, token);
      }
    }

    platformTelemetry.counter("builder.theme.loaded", 1, { themeId: theme.id });
  }

  get themeId(): string { return this.theme?.id ?? ""; }
  get themeName(): string { return this.theme?.name ?? ""; }

  getToken(key: string): ThemeToken | null { return this.tokens.get(key) ?? null; }

  getGroup(id: string): ThemeTokenGroup | null { return this.groups.get(id) ?? null; }

  listTokens(query?: ThemeQuery): ThemeToken[] {
    let results = Array.from(this.tokens.values());
    if (query?.category) results = results.filter((t) => t.category === query.category);
    if (query?.group) results = results.filter((t) => t.group === query.group);
    if (query?.search) {
      const s = query.search.toLowerCase();
      results = results.filter((t) => t.key.toLowerCase().includes(s) || t.value.toLowerCase().includes(s));
    }
    if (query?.deprecated !== undefined) results = results.filter((t) => (t.deprecated ?? false) === query.deprecated);
    return results;
  }

  listGroups(category?: TokenCategory): ThemeTokenGroup[] {
    let results = Array.from(this.groups.values());
    if (category) results = results.filter((g) => g.category === category);
    return results;
  }

  setTokenValue(key: string, value: string): boolean {
    const token = this.tokens.get(key);
    if (!token) return false;
    token.value = value;
    themeTransaction.trackChange(key);
    builderEvents.emit("token:changed" as never, { key, value } as never);
    return true;
  }

  addToken(groupId: string, token: ThemeToken): boolean {
    if (this.tokens.has(token.key)) return false;
    const group = this.groups.get(groupId);
    if (!group) return false;
    group.tokens.push(token);
    this.tokens.set(token.key, token);
    builderEvents.emit("token:added" as never, { key: token.key, groupId } as never);
    return true;
  }

  removeToken(key: string): boolean {
    const token = this.tokens.get(key);
    if (!token) return false;
    const group = this.groups.get(token.group ?? "");
    if (group) group.tokens = group.tokens.filter((t) => t.key !== key);
    this.tokens.delete(key);
    builderEvents.emit("token:removed" as never, { key } as never);
    return true;
  }

  getAllTokens(): Map<string, ThemeToken> { return new Map(this.tokens); }

  get size(): number { return this.tokens.size; }
  get groupCount(): number { return this.groups.size; }
}

export const themeRegistry = new ThemeRegistry();
