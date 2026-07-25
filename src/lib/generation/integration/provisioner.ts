import type { WebsiteBlueprint } from "@/lib/generation/composition/types";
import type { Artifact } from "@/lib/generation/artifacts/types";
import type { EventPublisher } from "@/lib/generation/contracts";
import type { WebsiteRecord, BuilderInitResult, PublishSnapshotResult, StorefrontRenderResult } from "./types";
import { WebsiteAdapter, BuilderAdapter, PublishAdapter, StorefrontAdapter } from "./adapters";
import { INTEGRATION_EVENTS } from "./integration-events";

export class Provisioner {
  private websiteAdapter = new WebsiteAdapter();
  private builderAdapter = new BuilderAdapter();
  private publishAdapter = new PublishAdapter();
  private storefrontAdapter = new StorefrontAdapter();

  constructor(private events: EventPublisher) {}

  async provisionWebsite(blueprint: WebsiteBlueprint, _artifacts: Artifact[]): Promise<WebsiteRecord> {
    void _artifacts;
    const record = this.websiteAdapter.adapt(blueprint);
    await this.publish(INTEGRATION_EVENTS.WEBSITE_PROVISIONED, {
      websiteId: record.id,
      title: record.title,
      domain: record.domain,
      version: record.version,
      timestamp: new Date().toISOString(),
    });
    return record;
  }

  async initializeBuilder(artifacts: Artifact[]): Promise<BuilderInitResult> {
    const result = this.builderAdapter.adapt(artifacts);
    await this.publish(INTEGRATION_EVENTS.BUILDER_INITIALIZED, {
      websiteId: result.websiteId,
      blocks: result.blocks,
      layout: result.layout,
      version: result.version,
      timestamp: new Date().toISOString(),
    });
    return result;
  }

  async createSnapshot(artifacts: Artifact[]): Promise<PublishSnapshotResult> {
    const result = this.publishAdapter.adapt(artifacts);
    await this.publish(INTEGRATION_EVENTS.SNAPSHOT_CREATED, {
      snapshotId: result.snapshotId,
      version: result.version,
      artifactCount: result.artifactCount,
      checksum: result.checksum,
      timestamp: new Date().toISOString(),
    });
    return result;
  }

  async renderStorefront(artifacts: Artifact[]): Promise<StorefrontRenderResult> {
    const result = this.storefrontAdapter.adapt(artifacts);
    await this.publish(INTEGRATION_EVENTS.STOREFRONT_UPDATED, {
      websiteId: "",
      sections: result.sections.length,
      products: result.products.length,
      version: 1,
      timestamp: new Date().toISOString(),
    });
    return result;
  }

  private async publish(eventType: string, payload: Record<string, unknown>): Promise<void> {
    try { await this.events.publish(eventType, payload); } catch {}
  }
}
