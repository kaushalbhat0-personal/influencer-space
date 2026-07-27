// ── Snapshot Serializer ───────────────────────────────────
// Sole boundary between PublishingService and the stored snapshot.
// No other code may serialize or deserialize PublishedSnapshot.

import {
  CURRENT_SNAPSHOT_VERSION,
  SNAPSHOT_SCHEMA,
  type PublishedSnapshot,
} from "@/types/snapshot";

export function serializeSnapshot(
  snapshot: PublishedSnapshot,
): Record<string, unknown> {
  return {
    _schema: SNAPSHOT_SCHEMA,
    _version: snapshot._version,
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

  const { _schema, _version, metadata, content, layout, theme, navigation, renderingHints } = data;

  if (!metadata || !content || !layout) return null;

  return {
    _schema: (_schema as PublishedSnapshot["_schema"]) ?? SNAPSHOT_SCHEMA,
    _version: (_version as number) ?? CURRENT_SNAPSHOT_VERSION,
    metadata: metadata as PublishedSnapshot["metadata"],
    content: content as PublishedSnapshot["content"],
    layout: layout as PublishedSnapshot["layout"],
    theme: (theme as PublishedSnapshot["theme"]) ?? {
      packageId: "neon-dark",
      colors: { primary: "#6366F1", secondary: "#818CF8", accent: "#A5B4FC", background: "#09090b", foreground: "#fafafa", muted: "#a1a1aa" },
      typography: { heading: "Inter", body: "Inter" },
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
    "_schema" in data &&
    "metadata" in data &&
    "content" in data &&
    "layout" in data
  );
}
