"use server";

import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { workspaceService } from "@/lib/workspace/service";
import { WorkspaceCookie } from "@/lib/workspace/cookie";

export async function switchWorkspace(workspaceId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const ws = await workspaceService.switch(workspaceId, session.user.id);
  if (!ws) return { success: false, error: "Workspace not found" };

  const cookieValue = WorkspaceCookie.encode({
    wid: ws.id,
    role: ws.role,
    type: ws.type,
  });

  const cookieStore = await cookies();
  cookieStore.set(WorkspaceCookie.cookieName, cookieValue, WorkspaceCookie.cookieOptions);

  return { success: true };
}

export async function listWorkspaces() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  return workspaceService.list(session.user.id);
}
