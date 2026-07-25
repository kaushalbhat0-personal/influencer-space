import { success } from "../helpers/result";

interface LockEntry {
  owner: string;
  expiresAt: number;
}

export class InMemoryLockProvider {
  private locks = new Map<string, LockEntry>();

  async acquire(resource: string, ttlMs = 30000) {
    const now = Date.now();
    const existing = this.locks.get(resource);
    if (existing) {
      if (now < existing.expiresAt) return success(false);
      this.locks.delete(resource);
    }
    this.locks.set(resource, { owner: "default", expiresAt: now + ttlMs });
    return success(true);
  }

  async release(resource: string) {
    this.locks.delete(resource);
    return success(undefined);
  }

  async extend(resource: string, ttlMs = 30000) {
    const existing = this.locks.get(resource);
    if (existing) {
      existing.expiresAt = Date.now() + ttlMs;
    }
    return success(undefined);
  }

  async isLocked(resource: string) {
    const existing = this.locks.get(resource);
    if (!existing) return success(false);
    if (Date.now() > existing.expiresAt) {
      this.locks.delete(resource);
      return success(false);
    }
    return success(true);
  }

  async clear() {
    this.locks.clear();
    return success(undefined);
  }

  get size(): number {
    return this.locks.size;
  }
}
