import dynamicImport from "next/dynamic";
import { BuilderErrorBoundary } from "./_components/builder-error-boundary";

const BuilderWorkspace = dynamicImport(
  () => import("./_components/workspace").then((m) => m.BuilderWorkspace),
  { ssr: false, loading: () => <div className="flex min-h-screen items-center justify-center bg-zinc-950"><p className="text-sm text-zinc-500">Loading builder...</p></div> }
);

export const dynamic = "force-dynamic";

export default function BuilderPage() {
  return (
    <BuilderErrorBoundary>
      <BuilderWorkspace />
    </BuilderErrorBoundary>
  );
}
