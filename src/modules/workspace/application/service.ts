import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { workspaceRepository } from "../infrastructure/repository";
import { WorkspaceCookie } from "../infrastructure/cookie";
import type { Workspace, WorkspaceMember } from "@/generated/prisma/client";

export interface ActiveWorkspace {
  id: string;
  type: "TENANT" | "AGENCY";
  slug: string;
  name: string;
  role: string;
  isFreelancer: boolean;
  /** RCCF-42: the session user the cookie is bound to (selector only). */
  uid?: string;
}

function toActive(workspace: Workspace, member: WorkspaceMember): ActiveWorkspace {
  return {
    id: workspace.id,
    type: workspace.type as "TENANT" | "AGENCY",
    slug: workspace.slug,
    name: workspace.name,
    role: member.role,
    isFreelancer: workspace.isFreelancer,
  };
}

class WorkspaceService {
  /** Get the currently active workspace from the request context. */
  getCurrent(): ActiveWorkspace | null {
    try {
      const headersList = headers();
      const cookieHeader = headersList.get("cookie") || "";
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${WorkspaceCookie.cookieName}=([^;]*)`));
      if (!match) return null;
      const payload = WorkspaceCookie.decode(match[1]!);
      if (!payload) return null;
      return {
        id: payload.wid,
        type: payload.type as "TENANT" | "AGENCY",
        slug: "",
        name: "",
        role: payload.role,
        isFreelancer: false,
        uid: payload.uid,
      };
    } catch {
      return null;
    }
  }

  /** Switch the active workspace. Returns the full active workspace with details. */
  async switch(workspaceId: string, userId: string): Promise<ActiveWorkspace | null> {
    const member = await workspaceRepository.findMember(workspaceId, userId);
    if (!member || member.status !== "ACTIVE") return null;
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) return null;
    return toActive(workspace, member);
  }

  /** List all workspaces the user can access. */
  async list(userId: string): Promise<ActiveWorkspace[]> {
    const memberships = await workspaceRepository.findMembershipsByUserId(userId);
    return memberships
      .filter((m) => m.status === "ACTIVE")
      .map((m) => toActive(m.workspace, m));
  }

  /** Resolve workspace from a cookie string. Used in middleware. */
  static resolveFromCookie(cookie: string): { workspaceId: string; role: string; type: string } | null {
    const payload = WorkspaceCookie.decode(cookie);
    if (!payload) return null;
    return { workspaceId: payload.wid, role: payload.role, type: payload.type };
  }

  /** Resolve the tenantId from the active workspace context.
   *  Tries the workspace cookie first (VERIFIED against the session user's
   *  membership — the cookie is a selector, never an authorization boundary),
   *  then falls back to the session tenantId. */
  async resolveTenantId(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    const sessionUserId = session?.user?.id;

    const ws = this.getCurrent();
    if (ws && sessionUserId && ws.uid === sessionUserId) {
      const workspace = await workspaceRepository.findById(ws.id);
      if (workspace?.tenantId) {
        const member = await workspaceRepository.findMember(workspace.id, sessionUserId);
        if (member?.status === "ACTIVE") return workspace.tenantId;
      }
    }
    return session?.user?.tenantId ?? null;
  }
}

export const workspaceService = new WorkspaceService();
