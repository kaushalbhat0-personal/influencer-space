export type ArtifactType =
  | "website_record"
  | "theme_record"
  | "pages"
  | "navigation"
  | "sections"
  | "products"
  | "gallery"
  | "seo"
  | "builder_json"
  | "publish_snapshot"
  | "storefront_json"
  | "robots_txt"
  | "sitemap_xml"
  | "manifest_json"
  | "metadata";

export interface ArtifactManifestEntry {
  id: string;
  type: ArtifactType;
  version: number;
  checksum: string;
  createdAt: string;
  dependencies: string[];
  sourceBlueprintVersion: number;
  size: number;
}

export interface Artifact<T = unknown> {
  manifest: ArtifactManifestEntry;
  data: T;
}

export interface ArtifactStore {
  get<T>(id: string, version?: number): Promise<Artifact<T> | null>;
  list(type?: ArtifactType): Promise<ArtifactManifestEntry[]>;
  save<T>(artifact: Artifact<T>): Promise<void>;
  delete(id: string, version?: number): Promise<void>;
}

export interface VersionHistory {
  artifactId: string;
  versions: Array<{ version: number; checksum: string; createdAt: string }>;
}

export interface PublishSnapshotData {
  id: string;
  blueprintChecksum: string;
  artifacts: string[];
  version: number;
  createdAt: string;
  records: {
    website: Record<string, unknown>;
    theme: Record<string, unknown>;
    pages: Array<Record<string, unknown>>;
    navigation: Record<string, unknown>;
    sections: Array<Record<string, unknown>>;
    products: Array<Record<string, unknown>>;
    gallery: Record<string, unknown>;
    seo: Record<string, unknown>;
  };
}

export interface StorefrontJSON {
  website: Record<string, unknown>;
  navigation: Record<string, unknown>;
  sections: Array<{ id: string; type: string; props: Record<string, unknown> }>;
  theme: Record<string, unknown>;
  seo: Record<string, unknown>;
  products: Array<Record<string, unknown>>;
  gallery: Record<string, unknown>;
  feed: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export const ARTIFACT_DEPENDENCIES: Record<ArtifactType, ArtifactType[]> = {
  website_record: [],
  theme_record: [],
  pages: ["navigation"],
  navigation: ["pages"],
  sections: ["pages"],
  products: [],
  gallery: [],
  seo: [],
  builder_json: ["pages", "sections", "products", "theme_record"],
  publish_snapshot: ["website_record", "theme_record", "pages", "navigation", "sections", "products", "gallery", "seo"],
  storefront_json: ["website_record", "theme_record", "navigation", "sections", "products", "gallery", "seo"],
  robots_txt: ["seo"],
  sitemap_xml: ["pages"],
  manifest_json: ["website_record", "theme_record"],
  metadata: [],
};

export function computeChecksum(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `chk_${Math.abs(hash).toString(16)}`;
}

export function createArtifactId(type: ArtifactType, blueprintChecksum: string): string {
  return `${type}_${blueprintChecksum.slice(0, 12)}`;
}
