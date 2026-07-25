import { Users, Eye, UserPlus, BarChart3, Rocket } from "lucide-react";

const FEATURES = [
  { icon: Users, title: "Multi-Client Management", body: "Switch between client workspaces without logging out. Each creator has their own storefront, products, and analytics." },
  { icon: Eye, title: "White-Label Ready", body: "Remove CreatorStore branding. Present a fully branded experience to your clients." },
  { icon: UserPlus, title: "Team Collaboration", body: "Invite team members, assign roles, and work together on client projects." },
  { icon: BarChart3, title: "Centralized Analytics", body: "View performance across all clients in one dashboard. Compare, analyze, and optimize." },
  { icon: Rocket, title: "Client Onboarding", body: "Generate a complete storefront from a client's social URL in minutes. No manual setup required." },
];

export function Agency() {
  return (
    <section id="agency" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for{" "}
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              agencies
            </span>
          </h2>
          <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
            Manage multiple creators from one workspace. Generate, publish, and grow — at scale.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/30 p-5 transition-all hover:border-white/[0.12] hover:bg-[var(--surface-base)]/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 mb-4">
                <feature.icon className="h-5 w-5 text-violet-400" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{feature.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a href="/signup" className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">
            Start your agency — Free →</a>
        </div>
      </div>
    </section>
  );
}
