import type { LockProvider } from "@/lib/generation/contracts";
import { success, failure } from "../infrastructure/helpers/result";

export class GenerationLock {
  constructor(private lockProvider: LockProvider) {}

  async acquire(creatorId: string) {
    const locked = await this.lockProvider.acquire(`gen:creator:${creatorId}`, 60000);
    if (!locked.success) return failure(new Error("Failed to acquire lock"));
    if (!locked.data) {
      return success("A generation is already in progress for this creator");
    }
    return success(null);
  }

  async release(creatorId: string) {
    return this.lockProvider.release(`gen:creator:${creatorId}`);
  }
}
