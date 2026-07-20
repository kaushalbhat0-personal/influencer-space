export type RegistryEventType =
  | "theme:registered"
  | "theme:removed"
  | "theme:default-changed"
  | "module:registered"
  | "module:removed"
  | "module:validated"
  | "module:lifecycle-changed"
  | "surface:registered"
  | "surface:removed"
  | "provider:registered"
  | "provider:removed"
  | "capability:registered"
  | "capability:removed"
  | "event:registered"
  | "feature-flag:toggled"
  | "snapshot:exported"
  | "snapshot:imported"
  | "diagnostics:completed"
  | "cache:invalidated";

export interface RegistryEventPayloads {
  "theme:registered": { themeId: string; themeName: string; source: string };
  "theme:removed": { themeId: string };
  "theme:default-changed": { previousId: string | null; newId: string };
  "module:registered": { moduleId: string; moduleName: string; domain: string; source: string };
  "module:removed": { moduleId: string };
  "module:validated": { moduleId: string; valid: boolean; errorCount: number; warningCount: number };
  "module:lifecycle-changed": { moduleId: string; from: string; to: string; timestamp: string };
  "surface:registered": { surfaceId: string; surfaceName: string };
  "surface:removed": { surfaceId: string };
  "provider:registered": { providerId: string; interfaceName: string };
  "provider:removed": { providerId: string };
  "capability:registered": { capabilityId: string; domain: string };
  "capability:removed": { capabilityId: string };
  "event:registered": { eventType: string };
  "feature-flag:toggled": { flagId: string; enabled: boolean };
  "snapshot:exported": { registryType: string; itemCount: number };
  "snapshot:imported": { registryType: string; itemCount: number };
  "diagnostics:completed": { moduleId: string; score: number; issuesFound: number };
  "cache:invalidated": { cacheName: string; reason: string };
}

export interface RegistryEvent<T extends RegistryEventType = RegistryEventType> {
  type: T;
  payload: RegistryEventPayloads[T];
  timestamp: number;
  id: string;
}

export type EventHandler<T extends RegistryEventType> = (event: RegistryEvent<T>) => void | Promise<void>;

export type UnsubscribeFn = () => void;

let eventCounter = 0;

function generateEventId(): string {
  eventCounter++;
  return `evt_${Date.now()}_${eventCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

export class RegistryEventBus {
  private subscribers = new Map<RegistryEventType, Set<EventHandler<RegistryEventType>>>();

  emit<T extends RegistryEventType>(type: T, payload: RegistryEventPayloads[T]): void {
    const event: RegistryEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
      id: generateEventId(),
    };

    const handlers = this.subscribers.get(type);
    if (handlers) {
      for (const handler of Array.from(handlers)) {
        try {
          const result = (handler as EventHandler<T>)(event);
          if (result instanceof Promise) {
            result.catch((err: unknown) => {
              console.error(`[RegistryEventBus] Async handler error for "${type}":`, err);
            });
          }
        } catch (err) {
          console.error(`[RegistryEventBus] Handler error for "${type}":`, err);
        }
      }
    }
  }

  on<T extends RegistryEventType>(
    type: T,
    handler: EventHandler<T>
  ): UnsubscribeFn {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(handler as EventHandler<RegistryEventType>);

    return () => {
      const handlers = this.subscribers.get(type);
      if (handlers) {
        handlers.delete(handler as EventHandler<RegistryEventType>);
        if (handlers.size === 0) {
          this.subscribers.delete(type);
        }
      }
    };
  }

  once<T extends RegistryEventType>(
    type: T,
    handler: EventHandler<T>
  ): UnsubscribeFn {
    const unsubscribe = this.on(type, ((event: RegistryEvent<T>) => {
      unsubscribe();
      handler(event);
    }) as EventHandler<T>);
    return unsubscribe;
  }

  removeAllListeners(type?: RegistryEventType): void {
    if (type) {
      this.subscribers.delete(type);
    } else {
      this.subscribers.clear();
    }
  }

  listenerCount(type?: RegistryEventType): number {
    if (type) {
      return this.subscribers.get(type)?.size ?? 0;
    }
    let count = 0;
    for (const handlers of Array.from(this.subscribers.values())) {
      count += handlers.size;
    }
    return count;
  }

  hasListeners(type: RegistryEventType): boolean {
    return (this.subscribers.get(type)?.size ?? 0) > 0;
  }

  destroy(): void {
    this.subscribers.clear();
    eventCounter = 0;
  }
}

export const registryEvents = new RegistryEventBus();
