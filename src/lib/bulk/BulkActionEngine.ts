import { revalidatePath } from "next/cache";

export interface BulkAction {
  label: string;
  action: "publish" | "archive" | "delete" | "restore" | "unpublish" | string;
  confirmMessage?: string;
  requireConfirmation?: boolean;
}

export interface BulkExecutor {
  publish?: (ids: string[], tenantId: string) => Promise<{ success: boolean; count?: number; error?: string }>;
  archive?: (ids: string[], tenantId: string) => Promise<{ success: boolean; count?: number; error?: string }>;
  delete?: (ids: string[], tenantId: string) => Promise<{ success: boolean; count?: number; error?: string }>;
  restore?: (ids: string[], tenantId: string) => Promise<{ success: boolean; count?: number; error?: string }>;
  unpublish?: (ids: string[], tenantId: string) => Promise<{ success: boolean; count?: number; error?: string }>;
}

export const BULK_ACTIONS: BulkAction[] = [
  { label: "Publish", action: "publish" },
  { label: "Archive", action: "archive", requireConfirmation: false },
  { label: "Delete", action: "delete", requireConfirmation: true, confirmMessage: "Delete {count} items? This cannot be undone." },
];

export async function executeBulkAction(
  executor: BulkExecutor,
  action: string,
  ids: string[],
  tenantId: string,
): Promise<{ success: boolean; count?: number; error?: string }> {
  const handler = executor[action as keyof BulkExecutor];
  if (!handler) {
    return { success: false, error: `Unknown bulk action: ${action}` };
  }
  return handler(ids, tenantId);
}

export class BulkActionEngine {
  constructor(
    private executor: BulkExecutor,
    private entityName: string,
    private revalidationPath: string = "/admin",
  ) {}

  async execute(action: string, ids: string[], tenantId: string) {
    const handler = this.executor[action as keyof BulkExecutor];
    if (!handler) {
      return { success: false as const, error: `Unknown bulk action: ${action}` };
    }
    const result = await handler(ids, tenantId);
    if (result.success) {
      revalidatePath(this.revalidationPath);
    }
    return result;
  }

  getAvailableActions(): BulkAction[] {
    return BULK_ACTIONS.filter((ba) => ba.action in this.executor);
  }
}
