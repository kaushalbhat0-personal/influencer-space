import type { ContentModuleManifest, ContentModuleAPI, ContentModuleRegistration, ProductModuleAPI, GalleryModuleAPI } from "./manifest";
import { productRegistration } from "./entities/product/manifest";
import { galleryRegistration } from "./entities/gallery";
import { contentRegistry, contentCommands, contentEvents, contentTransactions, contentDiagnostics } from "./index";

class ContentAPIImpl {
  private registrations = new Map<string, ContentModuleRegistration>();
  private instances = new Map<string, ContentModuleAPI>();
  private _products: ProductModuleAPI | null = null;
  private _gallery: GalleryModuleAPI | null = null;

  constructor() {
    this.registerModule(productRegistration);
    this.registerModule(galleryRegistration);
  }

  registerModule<T extends ContentModuleAPI = ContentModuleAPI>(
    registration: ContentModuleRegistration<T>
  ): void {
    this.registrations.set(registration.manifest.id, registration as ContentModuleRegistration);
  }

  resolve<T extends ContentModuleAPI = ContentModuleAPI>(id: string): T | null {
    const cached = this.instances.get(id);
    if (cached) return cached as T;

    const registration = this.registrations.get(id);
    if (!registration) return null;

    const instance = registration.factory();
    this.instances.set(id, instance);
    return instance as T;
  }

  listModules(): ContentModuleManifest[] {
    return Array.from(this.registrations.values()).map((r) => r.manifest);
  }

  get products(): ProductModuleAPI {
    if (this._products) return this._products;
    const resolved = this.resolve<ProductModuleAPI>("com.creatos.products");
    this._products = resolved ?? null!;
    return this._products;
  }

  get gallery(): GalleryModuleAPI {
    if (this._gallery) return this._gallery;
    const resolved = this.resolve<GalleryModuleAPI>("com.creatos.gallery");
    this._gallery = resolved ?? null!;
    return this._gallery;
  }

  get registry() { return contentRegistry; }
  get commands() { return contentCommands; }
  get events() { return contentEvents; }
  get transactions() { return contentTransactions; }
  get diagnostics() { return contentDiagnostics; }
}

export interface ContentAPI {
  readonly products: ProductModuleAPI;
  readonly gallery: GalleryModuleAPI;
  readonly registry: typeof contentRegistry;
  readonly commands: typeof contentCommands;
  readonly events: typeof contentEvents;
  readonly transactions: typeof contentTransactions;
  readonly diagnostics: typeof contentDiagnostics;
  registerModule<T extends ContentModuleAPI = ContentModuleAPI>(registration: ContentModuleRegistration<T>): void;
  resolve<T extends ContentModuleAPI = ContentModuleAPI>(id: string): T | null;
  listModules(): ContentModuleManifest[];
}

export const contentAPI: ContentAPI = new ContentAPIImpl() as ContentAPI;
