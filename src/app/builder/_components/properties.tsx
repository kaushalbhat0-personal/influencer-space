"use client";

import { Settings, Eye, Globe, FileText } from "lucide-react";

export function BuilderProperties() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
        <Settings className="h-3.5 w-3.5 text-zinc-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Properties</span>
      </div>

      <div className="flex-1 p-4">
        <div className="space-y-4">
          <Section title="Page" icon={FileText}>
            <PropertyRow label="Title" value="Home" />
            <PropertyRow label="Slug" value="/" />
            <PropertyRow label="Theme" value="Neon Dark" />
          </Section>

          <Section title="Visibility" icon={Eye}>
            <PropertyRow label="Status" value="Draft" />
            <PropertyRow label="Published" value="—" />
          </Section>

          <Section title="SEO" icon={Globe}>
            <PropertyRow label="Title" value="—" />
            <PropertyRow label="Description" value="—" />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Settings; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/5 bg-zinc-900/50">
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
        <Icon className="h-3 w-3 text-zinc-600" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{title}</span>
      </div>
      <div className="px-3 py-2">{children}</div>
    </div>
  );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[10px] text-zinc-600">{label}</span>
      <span className="text-[10px] text-zinc-400">{value}</span>
    </div>
  );
}
