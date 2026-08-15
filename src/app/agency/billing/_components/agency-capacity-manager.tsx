"use client";

import { useState, useTransition } from "react";
import { addAgencyCapacityAction, cancelAgencyCapacityAction } from "@/actions/partner.actions";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

interface AddonView {
  id: string;
  quantity: number;
  unitPriceInr: number;
  createdAt: string;
}

interface Props {
  includedLimit: number;
  addons: AddonView[];
  used: number;
  unitPriceInr: number;
}

export function AgencyCapacityManager({ includedLimit, addons, used, unitPriceInr }: Props) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const addonQty = addons.reduce((s, a) => s + a.quantity, 0);
  const effectiveLimit = includedLimit === -1 ? Infinity : includedLimit + addonQty;
  const remaining = effectiveLimit === Infinity ? null : Math.max(0, effectiveLimit - used);
  const recurring = addonQty * unitPriceInr;

  const buy = () => {
    startTransition(async () => {
      const key = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const res = await addAgencyCapacityAction({ quantity, idempotencyKey: key });
      if (res.success) {
        setNotice({ ok: true, message: `Added ${res.quantity} client website(s) at ${formatCurrency(res.unitPriceInr ?? unitPriceInr)}/month each.` });
        router.refresh();
      } else {
        setNotice({ ok: false, message: res.error ?? "Failed to add capacity" });
      }
    });
  };

  const cancel = (id: string) => {
    startTransition(async () => {
      const res = await cancelAgencyCapacityAction(id);
      if (res.success) {
        setNotice({ ok: true, message: "Capacity add-on cancelled." });
        router.refresh();
      } else {
        setNotice({ ok: false, message: res.error ?? "Failed to cancel" });
      }
    });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 text-sm" data-testid="capacity-manager">
      <h3 className="mb-1 font-semibold text-white">Client Website Capacity</h3>
      <p className="mb-4 text-xs text-zinc-500">
        Each managed creator client equals one client website. Additional capacity beyond your plan&apos;s included
        allowance is charged at <span className="text-zinc-300">{formatCurrency(unitPriceInr)}/month</span> per client website.
      </p>

      {notice && (
        <p className={`mb-3 rounded-lg p-2 text-xs ${notice.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
          {notice.message}
        </p>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Included</p>
          <p className="text-sm font-semibold text-white">{includedLimit === -1 ? "Unlimited" : includedLimit}</p>
        </div>
        <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Additional</p>
          <p className="text-sm font-semibold text-white">{addonQty}</p>
        </div>
        <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Used</p>
          <p className="text-sm font-semibold text-white">{used}</p>
        </div>
        <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Remaining</p>
          <p className="text-sm font-semibold text-white">{remaining === null ? "—" : remaining}</p>
        </div>
      </div>

      {addons.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {addons.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-zinc-800/30 px-3 py-1.5 text-xs">
              <span className="text-zinc-300">+{a.quantity} client website(s) · {formatCurrency(a.quantity * a.unitPriceInr)}/month</span>
              <span className="text-zinc-600">added {new Date(a.createdAt).toLocaleDateString()}</span>
              <button onClick={() => cancel(a.id)} disabled={pending} className="text-red-400 hover:text-red-300 disabled:opacity-40">Cancel</button>
            </div>
          ))}
          <p className="pt-1 text-xs text-zinc-400">Estimated recurring capacity amount: <span className="font-semibold text-emerald-300">{formatCurrency(recurring)}/month</span></p>
        </div>
      )}

      <div className="flex items-end gap-3">
        <label className="flex-1 max-w-[140px]">
          <span className="mb-1 block text-xs text-zinc-400">Additional client websites</span>
          <input
            type="number" min={1} max={100}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-s8ul-cyan/60"
          />
        </label>
        <button onClick={buy} disabled={pending || quantity < 1} className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-40">
          {pending ? "Adding…" : `Add capacity (${formatCurrency(quantity * unitPriceInr)}/mo)`}
        </button>
      </div>
    </div>
  );
}
