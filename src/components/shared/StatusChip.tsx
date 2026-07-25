import { cn } from "@/lib/utils";

export type StatusType = "PUBLISHED" | "DRAFT" | "ARCHIVED" | "ACTIVE" | "INACTIVE";

const STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  PUBLISHED: { dot: "bg-green-500", text: "text-green-400", label: "Published" },
  DRAFT: { dot: "bg-zinc-500", text: "text-zinc-400", label: "Draft" },
  ARCHIVED: { dot: "bg-amber-500", text: "text-amber-400", label: "Archived" },
  ACTIVE: { dot: "bg-green-500", text: "text-green-400", label: "Active" },
  INACTIVE: { dot: "bg-zinc-500", text: "text-zinc-400", label: "Inactive" },
};

interface StatusChipProps {
  status: string;
  dot?: boolean;
  className?: string;
}

export function StatusChip({ status, dot = true, className }: StatusChipProps) {
  const style = STATUS_STYLES[status] ?? { dot: "bg-zinc-500", text: "text-zinc-400", label: status };

  return (
    <span className={cn("inline-flex items-center gap-1.5", style.text, className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", style.dot)} />}
      <span className="text-[10px] font-medium uppercase tracking-wider">{style.label}</span>
    </span>
  );
}
