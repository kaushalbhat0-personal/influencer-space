"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { enterClientBuilder } from "@/actions/agency-builder.actions";
import { Activity } from "lucide-react";

export function AgencyBuilderButton({
  tenantId,
  label = "Open Builder",
  className,
  variant = "primary",
}: {
  tenantId: string;
  label?: string;
  className?: string;
  variant?: "primary" | "secondary" | "card";
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    startTransition(async () => {
      const res = await enterClientBuilder(tenantId);
      if (res.success) {
        router.push("/builder");
      } else {
        // Preserve tenant isolation: surface authorization error without leaking tenant enumeration
        alert(res.error ?? "Unable to open builder");
      }
    });
  };

  const base =
    variant === "primary"
      ? "rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90"
      : variant === "secondary"
        ? "rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        : "flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/50 p-6 hover:border-white/20 transition-all text-center";

  if (variant === "card") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-busy={pending}
        className={className ?? base}
        data-testid="agency-builder-button"
      >
        <Activity className="h-6 w-6 text-[var(--brand-primary)]" />
        <span className="text-sm font-medium text-white">{pending ? "Opening…" : label}</span>
        <span className="text-xs text-[var(--text-muted)]">Edit your layout</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-busy={pending}
      className={className ?? base}
      data-testid="agency-builder-button"
    >
      {pending ? "Opening…" : label}
    </button>
  );
}
