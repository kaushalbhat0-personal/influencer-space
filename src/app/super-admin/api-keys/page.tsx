import { EmptyState } from "@/components/ui/EmptyState";
import { Key } from "lucide-react";

export default function APIKeysPlaceholder() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">API Keys</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage platform API keys and developer access.</p>
      </div>
      <EmptyState
        icon={Key}
        title="Not Yet Implemented"
        description="API key management, rate limiting, and developer portal will be available in a future release alongside the public REST API."
      />
    </div>
  );
}
