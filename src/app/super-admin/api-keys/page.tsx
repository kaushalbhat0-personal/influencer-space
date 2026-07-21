import { EmptyState } from "@/components/ui/EmptyState";
import { Key } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function APIKeysPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">API Keys</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage platform API keys for integrations.</p>
      </div>
      <EmptyState
        title="API key management coming soon"
        description="Public API keys for headless integrations and developer access."
        icon={Key}
      />
    </div>
  );
}
