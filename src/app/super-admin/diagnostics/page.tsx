import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Monitor, Palette, CreditCard, Timer, Bot, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

const TOOLS = [
  { title: "Commerce Diagnostics", href: "/dev/commerce", icon: TrendingUp, desc: "Canonical commerce registry, capability matrix, legacy mapping." },
  { title: "Theme Runtime", href: "/dev/theme-runtime", icon: Palette, desc: "Theme → Experience resolution with plan eligibility matrix." },
  { title: "Billing Harness", href: "/dev/billing", icon: CreditCard, desc: "Billing simulator, webhook tester, event viewer." },
  { title: "Event Bus", href: "/super-admin/events", icon: Timer, desc: "In-memory event bus history and message inspection." },
  { title: "Generation Experience", href: "/dev/generation-experience", icon: Bot, desc: "AI generation pipeline testing and diagnostics." },
  { title: "AI Components", href: "/dev/ai-components", icon: Monitor, desc: "AI component testing environment." },
];

export default async function DiagnosticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") return <p className="p-8 text-sm text-red-400">SUPER_ADMIN only.</p>;

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Diagnostics Hub</h1>
            <p className="mt-1 text-sm text-zinc-400">Engineering tools — not for production operations.</p>
          </div>
          <span className="rounded bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">Engineering Only</span>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-4">
          <p className="text-xs text-amber-400">
            These tools are for engineering and development. They expose internal platform state,
            allow simulation of webhooks, and provide runtime introspection. Do not perform
            production mutations through these tools without explicit confirmation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-900/50 p-4 hover:bg-white/[0.03] transition-colors group"
            >
              <div className="shrink-0 h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <tool.icon className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-white group-hover:text-indigo-400 transition-colors">{tool.title}</p>
                  <span className="text-[9px] text-amber-500/50 uppercase tracking-wider">dev</span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{tool.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
