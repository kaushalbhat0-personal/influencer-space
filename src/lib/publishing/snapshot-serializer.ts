// ── Snapshot Serializer ───────────────────────────────────
// Sole boundary between PublishingService and the stored snapshot.
// No other code may serialize or deserialize PublishedSnapshot.

import {
  CURRENT_SNAPSHOT_VERSION,
  type PublishedSnapshot,
} from "@/types/snapshot";

export function serializeSnapshot(
  snapshot: PublishedSnapshot,
): Record<string, unknown> {
  return {
    _schema: CURRENT_SNAPSHOT_VERSION,
    snapshotVersion: snapshot.snapshotVersion,
    metadata: snapshot.metadata,
    content: snapshot.content,
    layout: snapshot.layout,
    theme: snapshot.theme,
    navigation: snapshot.navigation,
    renderingHints: snapshot.renderingHints,
  };
}

export function deserializeSnapshot(
  data: Record<string, unknown>,
): PublishedSnapshot | null {
  if (!data || typeof data !== "object") return null;

  const { snapshotVersion, metadata, content, layout, theme, navigation, renderingHints } = data;

  if (!metadata || !content || !layout) return null;

  return {
    snapshotVersion: (snapshotVersion as number) ?? CURRENT_SNAPSHOT_VERSION,
    metadata: metadata as PublishedSnapshot["metadata"],
    content: content as PublishedSnapshot["content"],
    layout: layout as PublishedSnapshot["layout"],
    theme: (theme as PublishedSnapshot["theme"]) ?? {
      packageId: "neon-dark",
      colors: {},
      fonts: {},
    },
    navigation: (navigation as PublishedSnapshot["navigation"]) ?? [],
    renderingHints: (renderingHints as PublishedSnapshot["renderingHints"]) ?? {},
  };
}

export function isPublishedSnapshot(
  data: Record<string, unknown>,
): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "snapshotVersion" in data &&
    "metadata" in data &&
    "content" in data &&
    "layout" in data
  );
}
