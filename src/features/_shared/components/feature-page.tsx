"use client";

import { Suspense } from "react";
import type { ReactNode } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { GlassCard } from "@/components/ui/GlassCard";

interface FeaturePageProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function FeaturePage({ title, description, children, actions }: FeaturePageProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="flex h-48 items-center justify-center">
              <LoadingSpinner size="lg" text="Loading..." />
            </div>
          }
        >
          {children}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

export function FeatureEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 h-12 w-12 rounded-full bg-zinc-800" />
      <h3 className="text-lg font-semibold text-zinc-200">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
      )}
      {action && (
        <button onClick={action.onClick} className="btn-primary mt-6 text-sm">
          {action.label}
        </button>
      )}
    </GlassCard>
  );
}
