"use client";

import { Suspense } from "react";
import type { ReactNode } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

interface FeaturePageProps {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  loading?: boolean;
}

export function FeaturePage({ title, description, children, actions, isEmpty, emptyTitle, emptyDescription, emptyAction, loading }: FeaturePageProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="platform-display sm:text-[2rem]">{title}</h1>
          {description && (
            <p className="platform-body mt-1.5 max-w-[65ch]">{description}</p>
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
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <LoadingSpinner size="lg" text="Loading..." />
            </div>
          ) : isEmpty ? (
            <EmptyState
              title={emptyTitle || "Nothing here yet"}
              description={emptyDescription || "Get started by adding your first item."}
              action={emptyAction}
            />
          ) : (
            children
          )}
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
    <EmptyState
      title={title}
      description={description}
      action={action ? (
        <button onClick={action.onClick} className="btn-primary text-sm">
          {action.label}
        </button>
      ) : undefined}
    />
  );
}
