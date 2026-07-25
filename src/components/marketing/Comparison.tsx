import { Check, Minus } from "lucide-react";

interface ComparisonRow {
  feature: string;
  creatorStore: boolean;
  linkBio: boolean;
  websiteBuilder: boolean;
}

const ROWS: ComparisonRow[] = [
  { feature: "AI Store Creation", creatorStore: true, linkBio: false, websiteBuilder: false },
  { feature: "Custom Domain", creatorStore: true, linkBio: false, websiteBuilder: true },
  { feature: "Digital Products", creatorStore: true, linkBio: false, websiteBuilder: true },
  { feature: "Courses", creatorStore: true, linkBio: false, websiteBuilder: false },
  { feature: "Coaching", creatorStore: true, linkBio: false, websiteBuilder: false },
  { feature: "Memberships", creatorStore: true, linkBio: false, websiteBuilder: false },
  { feature: "Physical Products", creatorStore: true, linkBio: false, websiteBuilder: true },
  { feature: "Analytics", creatorStore: true, linkBio: true, websiteBuilder: true },
  { feature: "SEO", creatorStore: true, linkBio: false, websiteBuilder: true },
  { feature: "Payments", creatorStore: true, linkBio: false, websiteBuilder: true },
];

const COLUMNS = [
  { key: "creatorStore" as const, label: "CreatorStore", accent: "text-indigo-400" },
  { key: "linkBio" as const, label: "Link-in-bio tools", accent: "text-zinc-500" },
  { key: "websiteBuilder" as const, label: "Website builders", accent: "text-zinc-500" },
];

function Cell({ present }: { present: boolean }) {
  return present ? (
    <Check className="h-4 w-4 text-emerald-400 mx-auto" aria-label="Included" />
  ) : (
    <Minus className="h-4 w-4 text-zinc-700 mx-auto" aria-label="Not included" />
  );
}

export function Comparison() {
  return (
    <section id="comparison" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Why{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              CreatorStore
            </span>
            ?
          </h2>
          <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
            See how we compare to other platforms. No fluff — just features that matter.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-3 pr-6 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider w-48">Feature</th>
                {COLUMNS.map((col) => (
                  <th key={col.key} className={`py-3 px-4 text-center text-xs font-semibold uppercase tracking-wider ${col.accent}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.feature} className="border-b border-white/[0.03]">
                  <td className="py-3 pr-6 text-zinc-300">{row.feature}</td>
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="py-3 px-4 text-center">
                      <Cell present={row[col.key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500">
            CreatorStore combines AI-powered store creation with products, courses, memberships, and payments — all in one platform.
          </p>
        </div>
      </div>
    </section>
  );
}
