import { EmptyState } from "@/components/ui/EmptyState";
import { Globe } from "lucide-react";

export default function DomainsPlaceholder() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Custom Domains</h1>
        <p className="mt-1 text-sm text-zinc-400">Domain management, SSL certificates, and DNS verification.</p>
      </div>
      <EmptyState
        icon={Globe}
        title="Not Yet Implemented"
        description="Custom domain overview, SSL status, and DNS verification will be available in a future release. Existing domain operations continue to work through the creator dashboard."
      />
    </div>
  );
}
