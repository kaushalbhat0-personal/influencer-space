import type { ConfigDiff, ConfigDiffResult, ConfigSnapshot, ConfigPatch, ConfigValue } from "./types";

export class DiffEngine {
  compare(before: ConfigSnapshot, after: ConfigSnapshot): ConfigDiffResult {
    const changes: ConfigDiff[] = [];
    const allKeys = new Set([
      ...Object.keys(before.entries),
      ...Object.keys(after.entries),
    ]);

    let added = 0;
    let removed = 0;
    let modified = 0;
    let unchanged = 0;

    for (const key of Array.from(allKeys)) {
      const beforeEntry = before.entries[key];
      const afterEntry = after.entries[key];

      if (!beforeEntry && afterEntry) {
        changes.push({
          key,
          operation: "added",
          before: null,
          after: afterEntry.value,
          layer: afterEntry.layer,
        });
        added++;
      } else if (beforeEntry && !afterEntry) {
        changes.push({
          key,
          operation: "removed",
          before: beforeEntry.value,
          after: null,
          layer: beforeEntry.layer,
        });
        removed++;
      } else if (beforeEntry && afterEntry) {
        if (this.isEqual(beforeEntry.value, afterEntry.value)) {
          changes.push({
            key,
            operation: "unchanged",
            before: beforeEntry.value,
            after: afterEntry.value,
            layer: afterEntry.layer,
          });
          unchanged++;
        } else {
          changes.push({
            key,
            operation: "modified",
            before: beforeEntry.value,
            after: afterEntry.value,
            layer: afterEntry.layer,
          });
          modified++;
        }
      }
    }

    return {
      before,
      after,
      changes,
      summary: { added, removed, modified, unchanged, total: allKeys.size },
    };
  }

  patch(current: Record<string, ConfigValue>, patches: ConfigPatch[]): Record<string, ConfigValue> {
    const result = { ...current };

    for (const patch of patches) {
      switch (patch.operation) {
        case "set":
          result[patch.key] = patch.value;
          break;
        case "delete":
          delete result[patch.key];
          break;
        case "merge":
          if (typeof patch.value === "object" && patch.value !== null && !Array.isArray(patch.value)) {
            const existing = result[patch.key];
            if (typeof existing === "object" && existing !== null && !Array.isArray(existing)) {
              result[patch.key] = this.deepMerge(
                existing as Record<string, ConfigValue>,
                patch.value as Record<string, ConfigValue>
              );
            } else {
              result[patch.key] = patch.value;
            }
          } else {
            result[patch.key] = patch.value;
          }
          break;
      }
    }

    return result;
  }

  generatePatches(
    before: Record<string, ConfigValue>,
    after: Record<string, ConfigValue>
  ): ConfigPatch[] {
    const patches: ConfigPatch[] = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of Array.from(allKeys)) {
      if (!(key in after)) {
        patches.push({ key, value: null, operation: "delete" });
      } else if (!(key in before)) {
        patches.push({ key, value: after[key]!, operation: "set" });
      } else if (!this.isEqual(before[key], after[key])) {
        patches.push({ key, value: after[key]!, operation: "set" });
      }
    }

    return patches;
  }

  preview(
    current: Record<string, ConfigValue>,
    patches: ConfigPatch[]
  ): { before: Record<string, ConfigValue>; after: Record<string, ConfigValue>; changes: ConfigDiff[] } {
    const after = this.patch(current, patches);

    const beforeSnapshot: ConfigSnapshot = {
      id: "preview-before",
      version: 0,
      entries: Object.fromEntries(
        Object.entries(current).map(([k, v]) => [
          k,
          { key: k, value: v, layer: "creator" as const, updatedAt: new Date().toISOString(), version: 0, locked: false },
        ])
      ),
      createdAt: new Date().toISOString(),
      createdBy: null,
      reason: "preview",
      metadata: {},
    };

    const afterSnapshot: ConfigSnapshot = {
      id: "preview-after",
      version: 1,
      entries: Object.fromEntries(
        Object.entries(after).map(([k, v]) => [
          k,
          { key: k, value: v, layer: "creator" as const, updatedAt: new Date().toISOString(), version: 0, locked: false },
        ])
      ),
      createdAt: new Date().toISOString(),
      createdBy: null,
      reason: "preview",
      metadata: {},
    };

    const diff = this.compare(beforeSnapshot, afterSnapshot);

    return { before: current, after, changes: diff.changes };
  }

  private isEqual(a: ConfigValue, b: ConfigValue): boolean {
    if (a === b) return true;
    if (typeof a === "object" && typeof b === "object") {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return false;
  }

  private deepMerge(
    target: Record<string, ConfigValue>,
    source: Record<string, ConfigValue>
  ): Record<string, ConfigValue> {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value === undefined) {
        delete result[key];
      } else if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        typeof result[key] === "object" &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        result[key] = this.deepMerge(
          result[key] as Record<string, ConfigValue>,
          value as Record<string, ConfigValue>
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
