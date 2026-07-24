"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { switchWorkspace as switchWorkspaceAction, listWorkspaces } from "@/actions/workspace.actions";
import type { ActiveWorkspace } from "@/modules/workspace/application/service";

interface WorkspaceContextValue {
  workspace: ActiveWorkspace | null;
  workspaces: ActiveWorkspace[];
  switchWorkspace: (id: string) => Promise<void>;
  isLoaded: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspace: null,
  workspaces: [],
  switchWorkspace: async () => {},
  isLoaded: false,
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [workspace, setWorkspace] = useState<ActiveWorkspace | null>(null);
  const [workspaces, setWorkspaces] = useState<ActiveWorkspace[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!session?.user?.id) {
      setWorkspace(null);
      setWorkspaces([]);
      setIsLoaded(true);
      return;
    }

    const user = session.user as { workspaceId?: string; workspaceType?: string; workspaceRole?: string };
    const userWorkspaces = await listWorkspaces();
    setWorkspaces(userWorkspaces);

    const currentId = user.workspaceId;
    if (currentId) {
      const match = userWorkspaces.find((w) => w.id === currentId);
      setWorkspace(match ?? userWorkspaces[0] ?? null);
    } else {
      setWorkspace(userWorkspaces[0] ?? null);
    }
    setIsLoaded(true);
  }, [session?.user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const switchWorkspace = useCallback(async (id: string) => {
    const result = await switchWorkspaceAction(id);
    if (result.success) {
      window.location.reload();
    }
  }, []);

  return (
    <WorkspaceContext.Provider value={{ workspace, workspaces, switchWorkspace, isLoaded }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
