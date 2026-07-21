import type { ContentModuleManifest, ContentModuleRegistration, ProductModuleAPI } from "../../manifest";
import type { Product, CreateProductInput, UpdateProductInput, ProductQuery, ProductDiagnostics } from "./types";
import { ProductApplicationService } from "./service";

const PRODUCT_MANIFEST: ContentModuleManifest = {
  id: "com.creatos.products",
  name: "products",
  version: "1.0.0",
  displayName: "Products",
  description: "Product management module",
  icon: "Package",
  category: "commerce",
  tags: ["products", "commerce"],
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
    created: "product:created",
    updated: "product:updated",
    deleted: "product:deleted",
    published: "product:published",
    archived: "product:archived",
    custom: {},
  },
  metadata: {},
};

function createProductAPI(): ProductModuleAPI {
  const svc = new ProductApplicationService();

  return {
    manifest: PRODUCT_MANIFEST,
    create: (i: CreateProductInput): Promise<Product> => svc.create(i),
    update: (id: string, i: UpdateProductInput): Promise<Product | null> => svc.update(id, i),
    delete: (id: string): Promise<boolean> => svc.delete(id),
    publish: (id: string): Promise<Product | null> => svc.publish(id),
    archive: (id: string): Promise<Product | null> => svc.archive(id),
    findById: (id: string): Promise<Product | null> => svc.findById(id),
    findBySlug: (tid: string, s: string): Promise<Product | null> => svc.findBySlug(tid, s),
    findByTenant: (tid: string): Promise<Product[]> => svc.findByTenant(tid),
    query: (q: ProductQuery): Promise<Product[]> => svc.query(q),
    search: (tid: string, t: string): Promise<Product[]> => svc.search(tid, t),
    diagnostics: (): Promise<ProductDiagnostics> => svc.getDetailedDiagnostics(),
  };
}

export const productRegistration: ContentModuleRegistration<ProductModuleAPI> = {
  manifest: PRODUCT_MANIFEST,
  factory: createProductAPI,
};
