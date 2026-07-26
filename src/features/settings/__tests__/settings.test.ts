/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTenantFindUnique, mockWorkspaceFindUnique, mockWorkspaceUpdate } = vi.hoisted(() => ({
  mockTenantFindUnique: vi.fn(),
  mockWorkspaceFindUnique: vi.fn(),
  mockWorkspaceUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findUnique: mockTenantFindUnique },
    workspace: { findUnique: mockWorkspaceFindUnique, update: mockWorkspaceUpdate },
  },
}));

import { settingsService } from "../service";

beforeEach(() => { vi.clearAllMocks(); });

describe("Settings service", () => {
  it("get returns defaults with workspace", async () => {
    mockTenantFindUnique.mockResolvedValue({ name: "Test Store" });
    mockWorkspaceFindUnique.mockResolvedValue({ name: "Workspace", locale: "en-US", timezone: "America/New_York", currency: "USD" });
    const result = await settingsService.get("t1");
    expect(result.workspaceName).toBe("Workspace");
    expect(result.locale).toBe("en-US");
    expect(result.currency).toBe("USD");
  });

  it("get falls back to tenant name when no workspace", async () => {
    mockTenantFindUnique.mockResolvedValue({ name: "Test Store" });
    mockWorkspaceFindUnique.mockResolvedValue(null);
    const result = await settingsService.get("t1");
    expect(result.workspaceName).toBe("Test Store");
    expect(result.timezone).toBe("Asia/Kolkata");
  });

  it("update modifies workspace fields", async () => {
    mockTenantFindUnique.mockResolvedValue({ name: "Store" });
    mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-1", tenantId: "t1" });
    mockWorkspaceUpdate.mockResolvedValue({});
    const result = await settingsService.update("t1", { workspaceName: "New Name", locale: "fr-FR" });
    expect(mockWorkspaceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ws-1" }, data: expect.objectContaining({ name: "New Name", locale: "fr-FR" }) }),
    );
  });

  it("update returns updated settings", async () => {
    mockTenantFindUnique.mockResolvedValue({ name: "Store" });
    mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-1", name: "New Name", locale: "fr-FR", timezone: "Europe/Paris", currency: "EUR" });
    mockWorkspaceUpdate.mockResolvedValue({});
    const result = await settingsService.update("t1", { timezone: "Europe/Paris" });
    expect(result.timezone).toBe("Europe/Paris");
  });
});
