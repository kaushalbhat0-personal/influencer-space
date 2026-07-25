"use client";

import { ChartCard } from "./ChartCard";
import { ChartEmpty } from "./ChartEmpty";
import { ChartError } from "./ChartError";
import { ChartSkeleton } from "./ChartSkeleton";
import type { ReactNode } from "react";

interface ChartWrapperProps {
  title: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function ChartWrapper({ title, description, loading, error, empty, emptyMessage, children, footer, className }: ChartWrapperProps) {
  return (
    <ChartCard
      title={title}
      description={description}
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage={emptyMessage}
      footer={footer}
      className={className}
    >
      {children}
    </ChartCard>
  );
}

export { ChartSkeleton, ChartError, ChartEmpty };
