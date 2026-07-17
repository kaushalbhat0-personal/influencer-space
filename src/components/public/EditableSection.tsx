import { Edit3 } from "lucide-react";

export function EditableSection({
  children,
  editHref,
  className = "",
}: {
  children: React.ReactNode;
  editHref?: string;
  className?: string;
}) {
  return (
    <section className={`group relative ${className}`}>
      {editHref && (
        <a
          href={editHref}
          className="absolute right-0 top-0 z-10 flex items-center gap-1.5 rounded-lg bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-400 opacity-0 ring-1 ring-white/10 backdrop-blur-sm transition-all hover:bg-zinc-800 hover:text-white group-hover:opacity-100"
        >
          <Edit3 className="h-3 w-3" />
          Edit
        </a>
      )}
      {children}
    </section>
  );
}
