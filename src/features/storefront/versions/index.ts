import type { VersionEntry } from "../types";

export async function listVersions(websiteId: string): Promise<VersionEntry[]> {
  const { prisma } = await import("@/lib/prisma");

  const snapshots = await prisma.publishSnapshot.findMany({
    where: { websiteId },
    orderBy: { version: "desc" },
    take: 50,
    select: { version: true, createdAt: true, state: true },
  }).catch(() => []);

  return snapshots.map((s) => ({
    version: s.version,
    publishedAt: s.createdAt.toISOString(),
    state: s.state as "live" | "preview" | "archived",
    label: `Version ${s.version}`,
  }));
}

export async function getVersion(websiteId: string, version: number): Promise<Record<string, unknown> | null> {
  const { publishSnapshotService } = await import("@/lib/publishing/snapshot");
  const result = await publishSnapshotService.get(websiteId, version);
  return result as unknown as Record<string, unknown> | null;
}

export async function diffVersions(
  websiteId: string,
  versionA: number,
  versionB: number,
): Promise<string[]> {
  const { publishSnapshotService } = await import("@/lib/publishing/snapshot");
  const a = await publishSnapshotService.get(websiteId, versionA);
  const b = await publishSnapshotService.get(websiteId, versionB);
  if (!a || !b) return [];

  const changes: string[] = [];
  const dataA = JSON.stringify(a);
  const dataB = JSON.stringify(b);
  if (dataA !== dataB) {
    const parsedA = JSON.parse(dataA) as Record<string, unknown>;
    const parsedB = JSON.parse(dataB) as Record<string, unknown>;
    const allKeys = Object.keys(parsedA).concat(Object.keys(parsedB));
    const uniqueKeys = allKeys.filter((k, i) => allKeys.indexOf(k) === i);
    for (const key of uniqueKeys) {
      if (JSON.stringify(parsedA[key]) !== JSON.stringify(parsedB[key])) {
        changes.push(`snapshot.${key}`);
      }
    }
  }
  return changes;
}

export async function rollbackToVersion(websiteId: string, version: number): Promise<boolean> {
  const { publishSnapshotService } = await import("@/lib/publishing/snapshot");
  try {
    const pages = await publishSnapshotService.rollback(websiteId, version);
    return !!pages;
  } catch {
    return false;
  }
}

export async function restoreVersion(websiteId: string, version: number): Promise<boolean> {
  return rollbackToVersion(websiteId, version);
}

export function formatVersionDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("en-IN", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}
