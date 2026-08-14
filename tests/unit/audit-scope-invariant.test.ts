import { describe, it, expect, vi, beforeEach } from "vitest";

// RCCF-55 hardening — AuditLog exactly-one-scope invariant. The audit writers
// (logAction / logAgencyAction) must produce a row with EXACTLY one populated
// scope (tenantId XOR agencyId). DB-level CHECK ("AuditLog_one_scope_check")
// enforces it too; these tests prove the writer boundary cannot emit an
// ambiguous row and rejects malformed scope calls.
const v = vi.hoisted(() => ({
  mockExecuteRawUnsafe: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $executeRawUnsafe: v.mockExecuteRawUnsafe },
}));

import { logAction, logAgencyAction } from "@/lib/audit";

beforeEach(() => {
  vi.clearAllMocks();
  v.mockExecuteRawUnsafe.mockResolvedValue(1);
});

describe("RCCF-55 hardening — audit scope invariant", () => {
  it("logAction writes ONLY tenantId (agencyId never referenced)", async () => {
    await logAction("t-1", "partner:creator-linked", { email: "a@b.c" });
    expect(v.mockExecuteRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql, ...params] = v.mockExecuteRawUnsafe.mock.calls[0] as [string, ...unknown[]];
    expect(sql).toContain('INSERT INTO "AuditLog"');
    expect(sql).toContain('"tenantId"');
    expect(sql).not.toContain('"agencyId"');
    expect(params[0]).toBe("t-1");
  });

  it("logAgencyAction writes tenantId=NULL and ONLY agencyId", async () => {
    await logAgencyAction("a-1", "partner:team-invited", { email: "a@b.c" });
    const [sql, ...params] = v.mockExecuteRawUnsafe.mock.calls[0] as [string, ...unknown[]];
    expect(sql).toContain('"agencyId"');
    expect(sql).toContain("NULL");
    expect(sql).not.toMatch(/VALUES \([^,]+,\s*\$1,?\s*,?[^)]*\)/);
    expect(params[0]).toBe("a-1");
  });

  it("logAction rejects a missing/empty tenant scope (no ambiguous row)", async () => {
    await expect(logAction("", "partner:creator-linked", {})).rejects.toThrow(/tenantId must be a non-empty id/i);
    await expect(logAction("   ", "partner:creator-linked", {})).rejects.toThrow(/tenantId must be a non-empty id/i);
    expect(v.mockExecuteRawUnsafe).not.toHaveBeenCalled();
  });

  it("logAgencyAction rejects a missing/empty agency scope (no ambiguous row)", async () => {
    await expect(logAgencyAction("", "partner:team-invited", {})).rejects.toThrow(/agencyId must be a non-empty id/i);
    await expect(logAgencyAction(undefined as unknown as string, "partner:team-invited", {})).rejects.toThrow(/agencyId must be a non-empty id/i);
    expect(v.mockExecuteRawUnsafe).not.toHaveBeenCalled();
  });

  it("sanitizeMetadata never emits token-bearing keys into the row", async () => {
    await logAgencyAction("a-1", "partner:team-invitation-sent", { email: "a@b.c", token: "abc", acceptUrl: "u", apiKey: "k" });
    const [, , , metadataJson] = v.mockExecuteRawUnsafe.mock.calls[0] as [string, string, string, string];
    expect(metadataJson).toContain("[REDACTED]");
    expect(metadataJson).not.toContain("abc");
  });
});
