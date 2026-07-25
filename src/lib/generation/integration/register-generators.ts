import { ArtifactRegistry } from "@/lib/generation/artifacts/artifact-registry";
import {
  WebsiteRecordGenerator, ThemeRecordGenerator, PagesGenerator,
  NavigationGenerator, SectionsGenerator, ProductsGenerator,
  GalleryGenerator, SEOGenerator,
} from "@/lib/generation/artifacts/generators/records";
import {
  BuilderJSONGenerator, StorefrontJSONGenerator, PublishSnapshotGenerator,
} from "@/lib/generation/artifacts/generators/composite";
import {
  RobotsGenerator, SitemapGenerator, ManifestGenerator, MetadataGenerator,
} from "@/lib/generation/artifacts/generators/files";

export function provisioner(registry: ArtifactRegistry): void {
  registry.register(new WebsiteRecordGenerator());
  registry.register(new ThemeRecordGenerator());
  registry.register(new PagesGenerator());
  registry.register(new NavigationGenerator());
  registry.register(new SectionsGenerator());
  registry.register(new ProductsGenerator());
  registry.register(new GalleryGenerator());
  registry.register(new SEOGenerator());
  registry.register(new BuilderJSONGenerator());
  registry.register(new StorefrontJSONGenerator());
  registry.register(new PublishSnapshotGenerator());
  registry.register(new RobotsGenerator());
  registry.register(new SitemapGenerator());
  registry.register(new ManifestGenerator());
  registry.register(new MetadataGenerator());
}
