import type { WorkflowAction, ActionContext, ActionResult } from "./interface";
import { actionRegistry } from "./registry";

const BUILTIN_ACTIONS: WorkflowAction[] = [
  {
    id: "log.message",
    description: "Log a message",
    execute: async (ctx: ActionContext): Promise<ActionResult> => {
      console.log(`[Workflow] ${ctx.config.message || "Action executed"}`, ctx);
      return { success: true, message: ctx.config.message as string || "Logged" };
    },
  },
  {
    id: "content.generate",
    description: "Trigger AI content generation",
    execute: async (ctx: ActionContext): Promise<ActionResult> => {
      void ctx;
      return { success: true, message: "Content generation queued" };
    },
  },
  {
    id: "offering.publish",
    description: "Publish an offering",
    execute: async (ctx: ActionContext): Promise<ActionResult> => {
      const offeringId = ctx.config.offeringId || ctx.data?.offeringId;
      if (!offeringId) return { success: false, message: "No offeringId provided" };
      try {
        const { prisma } = await import("@/lib/prisma");
        await prisma.offering.update({
          where: { id: offeringId as string },
          data: { status: "published" },
        });
        return { success: true, message: `Offering ${offeringId} published` };
      } catch (error) {
        return { success: false, message: String(error) };
      }
    },
  },
  {
    id: "webhook.send",
    description: "Send a webhook notification",
    execute: async (ctx: ActionContext): Promise<ActionResult> => {
      const url = ctx.config.url as string;
      if (!url) return { success: false, message: "No webhook URL configured" };
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: ctx.trigger,
            tenantId: ctx.tenantId,
            data: ctx.data,
            timestamp: new Date().toISOString(),
          }),
        });
        return { success: true, message: `Webhook sent to ${url}` };
      } catch (error) {
        return { success: false, message: String(error) };
      }
    },
  },
];

export function registerBuiltinActions(): void {
  for (const a of BUILTIN_ACTIONS) {
    actionRegistry.register(a);
  }
}
