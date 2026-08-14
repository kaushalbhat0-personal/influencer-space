import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockGetCurrent: vi.fn(),
  mockFindById: vi.fn(),
  mockFindMember: vi.fn(),
  mockGetServerSession: vi.fn(),
  mockResolveTenantId: vi.fn(),
}));

vi.mock("@/modules/workspace/application/service", () => ({
  workspaceService: { getCurrent: h.mockGetCurrent, resolveTenantId: h.mockResolveTenantId },
}));
vi.mock("@/modules/workspace/infrastructure/repository", () => ({
  workspaceRepository: { findById: h.mockFindById, findMember: h.mockFindMember },
}));
vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));

import { workspaceContext } from "@/modules/workspace/application/workspace-context";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const WS = "11111111-1111-4111-8111-111111111111";
const WS_OTHER = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  h.mockGetCurrent.mockReturnValue(null);
  h.mockFindById.mockImplementation(async (id: string) => {
    if (id === WS) return { id: WS, type: "AGENCY", tenantId: null, agencyId: "ag1" };
    if (id === WS_OTHER) return { id: WS_OTHER, type: "TENANT", tenantId: "t-other" };
    return null;
  });
  h.mockFindMember.mockImplementation(async (workspaceId: string, userId: string) => {
    if (workspaceId === WS && userId === USER_A) return { id: "m1", role: "OWNER", status: "ACTIVE" };
    return null;
  });
  h.mockResolveTenantId.mockResolvedValue(null);
});

describe("RCCF-42 — __workspace cookie is a selector, never an authorization boundary", () => {
  it("honors the cookie when it is bound to the session user AND they are an active member", async () => {
    h.mockGetCurrent.mockReturnValue({ id: WS, type: "AGENCY", role: "OWNER", uid: USER_A });
    h.mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const ctx = await workspaceContext.getActive();

    expect(ctx).not.toBeNull();
    expect(ctx!.workspaceId).toBe(WS);
    expect(ctx!.role).toBe("OWNER");
  });

  it("ignores the cookie when it is bound to a DIFFERENT user (shared/stale cookie)", async () => {
    h.mockGetCurrent.mockReturnValue({ id: WS, type: "AGENCY", role: "OWNER", uid: USER_B });
    h.mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const ctx = await workspaceContext.getActive();

    expect(ctx).toBeNull();
  });

  it("ignores the cookie when the session user is not a member of that workspace", async () => {
    h.mockGetCurrent.mockReturnValue({ id: WS_OTHER, type: "TENANT", role: "OWNER", uid: USER_A });
    h.mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });

    const ctx = await workspaceContext.getActive();

    expect(ctx).toBeNull();
  });

  it("derives the role from the live membership, never from the cookie", async () => {
    // Cookie claims OWNER but the live membership is MEMBER — role must be MEMBER.
    h.mockGetCurrent.mockReturnValue({ id: WS, type: "AGENCY", role: "OWNER", uid: USER_A });
    h.mockGetServerSession.mockResolvedValue({ user: { id: USER_A } });
    h.mockFindMember.mockResolvedValue({ id: "m1", role: "MEMBER", status: "ACTIVE" });

    const ctx = await workspaceContext.getActive();

    expect(ctx!.role).toBe("MEMBER");
  });
});
