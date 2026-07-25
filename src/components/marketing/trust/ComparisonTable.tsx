import { Check, Minus } from "lucide-react";
import type { ComparisonConfig } from "@/lib/marketing/trust/types";
import { Section, SectionHeading } from "@/components/marketing/Section";

interface ComparisonTableProps {
  readonly comparison: ComparisonConfig;
}

function CellValue({
  value,
}: {
  value: boolean | string;
}) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center">
        <Check className="h-4 w-4 text-emerald-400" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center">
        <Minus className="h-4 w-4 text-zinc-700" />
      </span>
    );
  }
  return (
    <span className="text-xs text-zinc-500 leading-tight block max-w-[100px]">
      {value}
    </span>
  );
}

export function ComparisonTable({ comparison }: ComparisonTableProps) {

  return (
    <Section id="comparison" background="subtle">
      <SectionHeading
        title={comparison.title}
        subtitle="See how CreatorStore compares to other tools for creators."
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="pb-3 pr-4 text-sm font-semibold text-white">
                Feature
              </th>
              <th className="pb-3 px-3 text-sm font-semibold text-indigo-400">
                {comparison.creatorStoreLabel}
              </th>
              {comparison.competitors.map((comp) => (
                <th
                  key={comp.id}
                  className="pb-3 pl-3 text-sm font-semibold text-zinc-400"
                >
                  {comp.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.features.map((feat, i) => (
              <tr
                key={`${feat.feature}-${i}`}
                className="border-b border-white/[0.03] last:border-0"
              >
                <td className="py-3 pr-4 text-sm text-zinc-300">
                  {feat.feature}
                </td>
                <td className="py-3 px-3">
                  <CellValue value={feat.creatorStore} />
                </td>
                <td className="py-3 px-3">
                  <CellValue value={feat.competitorA} />
                </td>
                <td className="py-3 pl-3">
                  <CellValue value={feat.competitorB} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
