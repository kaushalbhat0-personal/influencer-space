import type { ContentModuleManifest, ContentModuleRegistration } from "../../manifest";
import type {
  Gallery,
  GalleryMedia,
  CreateGalleryInput,
  UpdateGalleryInput,
  GalleryQuery,
  GalleryDiagnostics,
} from "./types";
import { GalleryApplicationService } from "./service";

const GALLERY_MANIFEST: ContentModuleManifest = {
  id: "com.creatos.gallery",
  name: "gallery",
  version: "1.0.0",
  displayName: "Gallery",
  description: "Visual gallery management for creator portfolios, media libraries, and photo collections",
  icon: "Images",
  category: "content",
  tags: ["gallery", "media", "portfolio", "photos", "visual"],
  capabilities: {
    creatable: true,
    updatable: true,
    deletable: true,
    archivable: true,
    restorable: true,
    duplicatable: true,
    publishable: true,
    searchable: true,
    sortable: true,
    filterable: true,
  },
  permissions: {
    create: [],
    read: [],
    update: [],
    delete: [],
    publish: [],
    admin: [],
  },
  events: {
    created: "gallery:created",
    updated: "gallery:updated",
    deleted: "gallery:deleted",
    published: "gallery:published",
    archived: "gallery:archived",
    custom: {
      mediaAdded: "gallery:mediaAdded",
      mediaRemoved: "gallery:mediaRemoved",
      mediaReordered: "gallery:mediaReordered",
      coverChanged: "gallery:coverChanged",
    },
  },
  metadata: {},
};

export interface GalleryModuleAPI {
  readonly manifest: ContentModuleManifest;

  create(input: CreateGalleryInput): Promise<Gallery>;
  update(id: string, input: UpdateGalleryInput): Promise<Gallery | null>;
  delete(id: string): Promise<boolean>;
  publish(id: string): Promise<Gallery | null>;
  archive(id: string): Promise<Gallery | null>;
  findById(id: string): Promise<Gallery | null>;
  findBySlug(tenantId: string, slug: string): Promise<Gallery | null>;
  findByTenant(tenantId: string): Promise<Gallery[]>;
  query(query: GalleryQuery): Promise<Gallery[]>;
  search(tenantId: string, term: string): Promise<Gallery[]>;
  addMedia(galleryId: string, media: GalleryMedia): Promise<Gallery | null>;
  removeMedia(galleryId: string, mediaId: string): Promise<Gallery | null>;
  reorderMedia(galleryId: string, orderedIds: string[]): Promise<Gallery | null>;
  setCoverImage(galleryId: string, mediaId: string | null): Promise<Gallery | null>;
  diagnostics(): Promise<GalleryDiagnostics>;
}

function createGalleryAPI(): GalleryModuleAPI {
  const svc = new GalleryApplicationService();

  return {
    manifest: GALLERY_MANIFEST,
    create: (i: CreateGalleryInput): Promise<Gallery> => svc.create(i),
    update: (id: string, i: UpdateGalleryInput): Promise<Gallery | null> => svc.update(id, i),
    delete: (id: string): Promise<boolean> => svc.delete(id),
    publish: (id: string): Promise<Gallery | null> => svc.publish(id),
    archive: (id: string): Promise<Gallery | null> => svc.archive(id),
    findById: (id: string): Promise<Gallery | null> => svc.findById(id),
    findBySlug: (tid: string, s: string): Promise<Gallery | null> => svc.findBySlug(tid, s),
    findByTenant: (tid: string): Promise<Gallery[]> => svc.findByTenant(tid),
    query: (q: GalleryQuery): Promise<Gallery[]> => svc.query(q),
    search: (tid: string, t: string): Promise<Gallery[]> => svc.search(tid, t),
    addMedia: (gid: string, m: GalleryMedia): Promise<Gallery | null> => svc.addMedia(gid, m),
    removeMedia: (gid: string, mid: string): Promise<Gallery | null> => svc.removeMedia(gid, mid),
    reorderMedia: (gid: string, ids: string[]): Promise<Gallery | null> => svc.reorderMedia(gid, ids),
    setCoverImage: (gid: string, mid: string | null): Promise<Gallery | null> => svc.setCoverImage(gid, mid),
    diagnostics: (): Promise<GalleryDiagnostics> => svc.getDetailedDiagnostics(),
  };
}

export const galleryRegistration: ContentModuleRegistration<GalleryModuleAPI> = {
  manifest: GALLERY_MANIFEST,
  factory: createGalleryAPI,
};
