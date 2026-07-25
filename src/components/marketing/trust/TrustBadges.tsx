const BADGES = [
  {
    label: "No credit card required",
    color: "text-emerald-400",
  },
  {
    label: "2-minute setup",
    color: "text-indigo-400",
  },
  {
    label: "Free SSL",
    color: "text-violet-400",
  },
  {
    label: "Secure via Razorpay",
    color: "text-amber-400",
  },
  {
    label: "Cancel anytime",
    color: "text-zinc-400",
  },
] as const;

interface TrustBadgesProps {
  readonly badges?: readonly { label: string; color?: string }[];
  readonly className?: string;
}

export function TrustBadges({
  badges = BADGES,
  className = "",
}: TrustBadgesProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-4 text-xs text-zinc-500 ${className}`}
    >
      {badges.map((badge) => (
        <span
          key={badge.label}
          className="flex items-center gap-1.5"
        >
          <svg
            className={`h-3.5 w-3.5 ${
              badge.color ?? "text-emerald-500"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          {badge.label}
        </span>
      ))}
    </div>
  );
}
