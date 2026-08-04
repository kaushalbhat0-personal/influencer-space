import type { ReactNode } from "react";

interface SectionProps {
  readonly id?: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly containerClassName?: string;
  readonly background?: "none" | "subtle" | "gradient";
  /**
   * IMPLEMENTATION-43 Phase 7 background system: every section flows from the
   * previous one with no abrupt black boxes.
   *  - hero:     radial highlight + soft gradient (top of page)
   *  - surface:  soft elevated surface (features/content)
   *  - elevated: stronger surface + top highlight (pricing)
   *  - neutral:  flat neutral (FAQ)
   */
  readonly tone?: "hero" | "surface" | "elevated" | "neutral";
}

const BG_CLASSES = {
  none: "",
  subtle: "bg-zinc-900/30",
  gradient:
    "bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.04),transparent_60%)]",
} as const;

const TONE_CLASSES = {
  hero: "bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.10),transparent_55%)] bg-zinc-950",
  surface: "bg-zinc-900/20",
  elevated: "bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.06),transparent_60%)] bg-zinc-900/10 border-y border-white/[0.04]",
  neutral: "bg-zinc-950",
} as const;

export function Section({
  id,
  children,
  className = "",
  containerClassName = "",
  background = "none",
  tone,
}: SectionProps) {
  const toneClass = tone ? TONE_CLASSES[tone] : "";
  return (
    <section
      id={id}
      className={`relative px-4 py-20 sm:px-8 sm:py-28 ${BG_CLASSES[background]} ${toneClass} ${className}`}
    >
      <div className={`mx-auto max-w-7xl ${containerClassName}`}>
        {children}
      </div>
    </section>
  );
}

interface SectionHeadingProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly align?: "center" | "left";
  readonly gradient?: string;
}

export function SectionHeading({
  title,
  subtitle,
  align = "center",
  gradient = "from-indigo-400 to-violet-400",
}: SectionHeadingProps) {
  return (
    <div
      className={
        align === "center"
          ? "mb-14 text-center"
          : "mb-10"
      }
    >
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {title.includes("CreatorStore") ? (
          <>
            {title.split("CreatorStore").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span
                    className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
                  >
                    CreatorStore
                  </span>
                )}
              </span>
            ))}
          </>
        ) : (
          title
        )}
      </h2>
      {subtitle && (
        <p className="mt-3 text-zinc-500 max-w-2xl mx-auto">{subtitle}</p>
      )}
    </div>
  );
}
