import { cn } from "@/lib/utils";

interface HealthCategory {
  label: string;
  score: number; // 0-100
  href: string;
}

interface HealthScoreProps {
  categories: HealthCategory[];
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export function HealthScore({ categories }: HealthScoreProps) {
  const overall = categories.length > 0
    ? Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length)
    : 0;

  return (
    <div className="admin-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Business Health</h3>
        <span className={cn("text-lg font-bold tabular-nums font-display", scoreColor(overall))}>{overall}%</span>
      </div>
      <div className="space-y-2.5">
        {categories.map((cat) => (
          <a key={cat.label} href={cat.href} className="flex items-center gap-3 group">
            <span className="text-xs text-zinc-400 w-20">{cat.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", scoreBg(cat.score))}
                style={{ width: `${cat.score}%` }}
              />
            </div>
            <span className={cn("text-xs font-medium w-8 text-right tabular-nums", scoreColor(cat.score))}>
              {cat.score}%
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
