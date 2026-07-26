import { platformEventBus } from "@/lib/events";
import { sessionService } from "./service";
import { sessionRegistry } from "./registry";

export function subscribeSessionEvents(): () => void {
  const unsubGenerating = platformEventBus.subscribe("WebsiteBeingGenerated", async (event) => {
    const correlationId = event.correlationId ?? event.payload.correlationId;
    if (!correlationId) return;

    const session = await sessionRegistry.findByCorrelationId(correlationId);
    if (session && session.status === "running") {
      await sessionService.updateProgress(session.id, {
        currentStage: "artifact_generation",
      });
    }
  });

  const unsubProvisioned = platformEventBus.subscribe("CreatorProvisioned", async (event) => {
    const correlationId = event.correlationId ?? event.payload.correlationId;
    if (!correlationId) return;

    const session = await sessionRegistry.findByCorrelationId(correlationId);
    if (!session || session.status !== "running") return;

    const { tenantId } = event.payload;
    await sessionService.updateProgress(session.id, {
      status: "publishing",
      currentStage: "provisioning",
      storefrontUrl: tenantId ? `/${tenantId}` : undefined,
    });
  });

  const unsubPublished = platformEventBus.subscribe("WebsitePublished", async (event) => {
    const correlationId = event.correlationId ?? event.payload.correlationId;
    if (!correlationId) return;

    const session = await sessionRegistry.findByCorrelationId(correlationId);
    if (!session) return;

    const { storefrontUrl } = event.payload;
    await sessionService.complete(session.id, {
      storefrontUrl: storefrontUrl ?? session.storefrontUrl,
    });
  });

  return () => {
    unsubGenerating();
    unsubProvisioned();
    unsubPublished();
  };
}
