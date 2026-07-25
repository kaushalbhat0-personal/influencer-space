"use client";

import { DashboardWidget } from "@/components/ui/DashboardWidget";
import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  variant?: "default" | "compact";
}

export function ChartCard({ title, description, loading, error, empty, emptyMessage, children, footer, className, variant }: ChartCardProps) {
  return (
    <DashboardWidget
      title={title}
      description={description}
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage={emptyMessage}
      footer={footer}
      className={className}
      variant={variant}
    >
      <div className="w-full" role="img" aria-label={`${title} chart`}>
        {children}
      </div>
    </DashboardWidget>
  );
}
