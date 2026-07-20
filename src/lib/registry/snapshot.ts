export interface SnapshotMetadata {
  version: string;
  platformVersion: string;
  createdAt: string;
  registryType: string;
  source: string;
}

export interface RegistrySnapshot<T = unknown> {
  metadata: SnapshotMetadata;
  items: Record<string, T>;
  stats: {
    totalItems: number;
    snapshotSize: number;
  };
}

export interface ISnapshotable<TItem = unknown> {
  snapshot(): RegistrySnapshot<TItem>;

  serialize(): string;

  deserialize(raw: string): RegistrySnapshot<TItem> | null;

  export(): Record<string, unknown>;

  import(data: Record<string, unknown>): { success: boolean; imported: number; errors: string[] };
}

export function createSnapshotMetadata(
  registryType: string,
  source: string = "platform"
): SnapshotMetadata {
  return {
    version: "1.0.0",
    platformVersion: "1.0.0",
    createdAt: new Date().toISOString(),
    registryType,
    source,
  };
}

export function serializeSnapshot(snapshot: RegistrySnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function deserializeSnapshot(raw: string): RegistrySnapshot | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.metadata || !parsed.items || !parsed.stats) {
      return null;
    }
    return parsed as RegistrySnapshot;
  } catch {
    return null;
  }
}

export function validateSnapshot(snapshot: RegistrySnapshot): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!snapshot.metadata) {
    errors.push("Missing metadata");
  } else {
    if (!snapshot.metadata.registryType) errors.push("Missing metadata.registryType");
    if (!snapshot.metadata.version) errors.push("Missing metadata.version");
    if (!snapshot.metadata.createdAt) errors.push("Missing metadata.createdAt");
  }

  if (!snapshot.items || typeof snapshot.items !== "object") {
    errors.push("Missing or invalid items");
  }

  if (!snapshot.stats) {
    errors.push("Missing stats");
  }

  return { valid: errors.length === 0, errors };
}
