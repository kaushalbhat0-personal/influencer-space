import { workspaceLifecycle, type WorkspaceStatus } from "@/lib/workspace/lifecycle";

export function WorkspaceStatusBadge({ status }: { status: WorkspaceStatus }) {
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${workspaceLifecycle.badgeColor(status)}`}>
      {workspaceLifecycle.label(status)}
    </span>
  );
}
