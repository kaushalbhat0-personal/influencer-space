import { BuilderWorkspace } from "./_components/workspace";
import { BuilderErrorBoundary } from "./_components/builder-error-boundary";

export const dynamic = "force-dynamic";

export default function BuilderPage() {
  return (
    <BuilderErrorBoundary>
      <BuilderWorkspace />
    </BuilderErrorBoundary>
  );
}
