import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const SIZES = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-full",
};

export function ContentContainer({ children, className, size = "lg" }: ContainerProps) {
  return <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", SIZES[size], className)}>{children}</div>;
}

export function PageSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("mb-8", className)}>{children}</section>;
}

export function MetricGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4", className)}>{children}</div>;
}

export function DashboardGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6", className)}>{children}</div>;
}

export function DashboardGridMain({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("lg:col-span-2 space-y-6", className)}>{children}</div>;
}

export function DashboardGridSide({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}
