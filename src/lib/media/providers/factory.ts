import type { StorageProvider } from "./interface";
import { SupabaseStorageProvider } from "./supabase";
import { LocalStorageProvider } from "./local";

export type ProviderType = "supabase" | "local";

export class StorageProviderFactory {
  private static instance: StorageProviderFactory;
  private provider: StorageProvider | null = null;

  static getInstance(): StorageProviderFactory {
    if (!this.instance) this.instance = new StorageProviderFactory();
    return this.instance;
  }

  getProvider(type?: ProviderType): StorageProvider {
    if (this.provider) return this.provider;

    const resolvedType = type ?? this.resolveType();
    this.provider = this.createProvider(resolvedType);
    return this.provider;
  }

  setProvider(provider: StorageProvider): void {
    this.provider = provider;
  }

  resetProvider(): void {
    this.provider = null;
  }

  private resolveType(): ProviderType {
    const env = process.env.MEDIA_STORAGE_PROVIDER;
    if (env === "supabase" || env === "local") return env;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return "supabase";
    }
    return "local";
  }

  private createProvider(type: ProviderType): StorageProvider {
    switch (type) {
      case "supabase": {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
          if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
            throw new Error("Supabase credentials required for production storage");
          }
          return new LocalStorageProvider();
        }
        return new SupabaseStorageProvider(url, key);
      }
      case "local":
        return new LocalStorageProvider();
    }
  }
}

export const storageProviderFactory = StorageProviderFactory.getInstance();
