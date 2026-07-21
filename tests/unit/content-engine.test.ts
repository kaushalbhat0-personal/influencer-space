import { describe, it, expect, beforeEach } from "vitest";
import { contentRegistry } from "@/lib/content/registry";
import { contentCommands, contentEvents, contentTransactions, contentPolicies, contentValidator, contentDiagnostics, contentSerializer } from "@/lib/content/engine";
import type { ContentEntityRegistration } from "@/lib/content/types";

const productType: ContentEntityRegistration = {
  type: "product", displayName: "Product", icon: "Package", category: "commerce",
  capabilities: { creatable: true, updatable: true, deletable: true, archivable: true, restorable: true, duplicatable: true, publishable: true, searchable: true, sortable: true, filterable: true },
  validationSchema: {}, defaultData: {}, metadata: {},
};

describe("ContentEngine", () => {
  beforeEach(() => {
    for (const e of contentRegistry.getAll()) contentRegistry.delete(e.id);
  });

  describe("ContentRegistry", () => {
    it("should register entity types", () => {
      const result = contentRegistry.registerType(productType);
      expect(result.success).toBe(true);
      expect(contentRegistry.typeCount).toBeGreaterThanOrEqual(1);
    });

    it("should prevent duplicate types", () => {
      contentRegistry.registerType(productType);
      const result = contentRegistry.registerType(productType);
      expect(result.success).toBe(false);
    });
  });

  describe("ContentCommands", () => {
    it("should create an entity", () => {
      const result = contentCommands.execute({ name: "create", type: "product", input: { tenantId: "t1", slug: "my-product", data: { name: "Test" } } });
      expect(result.success).toBe(true);
      expect(result.entityId).not.toBeNull();
    });

    it("should update an entity", () => {
      const created = contentCommands.execute({ name: "create", type: "product", input: { tenantId: "t1", slug: "upd", data: {} } });
      const result = contentCommands.execute({ name: "update", type: "product", input: { id: created.entityId, data: { name: "Updated" } } });
      expect(result.success).toBe(true);
    });

    it("should delete an entity", () => {
      const created = contentCommands.execute({ name: "create", type: "product", input: { tenantId: "t1", slug: "del", data: {} } });
      const result = contentCommands.execute({ name: "delete", type: "product", input: { id: created.entityId } });
      expect(result.success).toBe(true);
      expect(contentRegistry.get(created.entityId!)).toBeNull();
    });

    it("should publish and archive", () => {
      const created = contentCommands.execute({ name: "create", type: "product", input: { tenantId: "t1", slug: "pub", data: {} } });
      const pub = contentCommands.execute({ name: "publish", type: "product", input: { id: created.entityId } });
      expect(pub.success).toBe(true);
      const arch = contentCommands.execute({ name: "archive", type: "product", input: { id: created.entityId } });
      expect(arch.success).toBe(true);
    });
  });

  describe("ContentEvents", () => {
    it("should emit events on create", () => {
      let emitted = false;
      const unsub = contentEvents.on("content:created", () => { emitted = true; });
      contentCommands.execute({ name: "create", type: "product", input: { tenantId: "t1", slug: "evt", data: {} } });
      expect(emitted).toBe(true);
      unsub();
    });
  });

  describe("ContentTransactions", () => {
    it("should rollback changes", () => {
      const before = contentRegistry.count();
      contentTransactions.begin();
      contentCommands.execute({ name: "create", type: "product", input: { tenantId: "t1", slug: "tx", data: {} } });
      contentTransactions.rollback();
      expect(contentRegistry.count()).toBe(before);
    });
  });

  describe("ContentSerializer", () => {
    it("should serialize and deserialize", () => {
      contentCommands.execute({ name: "create", type: "product", input: { tenantId: "t1", slug: "ser", data: {} } });
      const json = contentSerializer.serialize();
      const result = contentSerializer.deserialize(json);
      expect(result.success).toBe(true);
      expect(result.imported).toBeGreaterThan(0);
    });
  });
});
