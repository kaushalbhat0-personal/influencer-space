"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { AlertTriangle } from "lucide-react";

export default function SuperAdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-64 items-center justify-center">
      <EmptyState title="Something went wrong" description={error.message || "An unexpected error occurred."} icon={AlertTriangle}
        action={<button onClick={reset} className="btn-secondary text-sm mt-4">Try again</button>}
      />
    </div>
  );
}
