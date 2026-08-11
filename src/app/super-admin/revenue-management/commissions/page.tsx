import { revenueService } from "@/modules/billing/application/revenue-service";
import { getLoyaltyTiers } from "@/lib/commission/loyalty";
import { CommissionClient } from "./_components/commission-client";

export const dynamic = "force-dynamic";

export default async function CommissionCenterPage() {
  const [config, loyaltyTiers] = await Promise.all([
    revenueService.getCommissionConfig(),
    getLoyaltyTiers(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Commission Center</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Platform revenue sharing, agency splits, and referral rates — editable by Super Admin.
        </p>
      </div>

      <CommissionClient initial={config} />

      {loyaltyTiers.length > 0 && (
        <div className="mt-6 rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Loyalty Tiers (by active clients)</h3>
          <p className="mb-4 text-xs text-zinc-500">
            Agencies earn an automatic recurring share that scales with their live-subscription client count.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {loyaltyTiers.map((t) => (
              <div key={t.id} className="rounded-lg bg-zinc-800/50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{t.name}</span>
                  <span className="text-sm font-bold text-emerald-400">{t.commissionPercent}%</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {t.minActiveClients}–{t.maxActiveClients ?? "∞"} active clients
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-amber-500/10 bg-amber-500/5 p-3">
        <p className="text-xs text-amber-400">
          Commission configuration is read via RevenueService and consumed by BillingService during payment capture. Changes to these values affect future commission calculations only.
        </p>
      </div>
    </div>
  );
}
