"use client";

// RCCF-72.18D.5.2-B — Creator Order Detail Drawer.
//
// Consumer of the D.5.2-A canonical truth layer (getCreatorOrderDetail).
//   - refund initiation belongs to D.5.2-D (no refund actions are called)
// RCCF-72.18D.5.2-C — fulfillment controls added for eligible PHYSICAL orders:
//   - candidate buttons derive from the CANONICAL strategy table (presentation
//     only); the server action remains the sole authority over role, tenant,
//     product boundary, and transition legality — bypassing this UI changes
//     nothing (every illegal request is rejected server-side)
//   - every mutation ends with a server-truth refresh; failures surface safe
//     messages plus the actual persisted state (no optimistic invention)
// Detail loading is LAZY: one request per opened order, never per table row
// (≤2 server queries as established by D.5.2-A). No credentials, tenant IDs,
// or payment-account identifiers are rendered — the projection itself is
// already credential-safe and this component adds nothing beyond it.

import { useCallback, useEffect, useMemo, useState } from "react";
import { EditDrawer } from "@/features/_shared/components/edit-drawer";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";
import { getCreatorOrderDetail } from "@/actions/order.actions";
import type { CreatorOrderDetailView } from "@/actions/order.actions";
import { updateFulfillmentStatus } from "@/actions/fulfillment.actions";
import { requestProductOrderRefund, executeProductOrderRefund } from "@/actions/payment-account.actions";
import { statusLabel } from "@/modules/fulfillment/application/strategies";
import type { FulfillmentStatus } from "@/modules/fulfillment/domain/types";
import {
  formatOrderAmount,
  formatOrderDate,
  formatPaise,
  getOrderStatusPresentation,
  getRefundStatusPresentation,
  getFulfillmentControls,
  parseRefundAmountInput,
  getRefundErrorMessage,
} from "./order-presentation";

interface OrderDetailDrawerProps {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; order: CreatorOrderDetailView };

export function OrderDetailDrawer({ orderId, open, onClose }: OrderDetailDrawerProps) {
  const [state, setState] = useState<LoadState>({ phase: "loading" });

  useEffect(() => {
    if (!open || !orderId) return;
    let cancelled = false;
    setState({ phase: "loading" });
    getCreatorOrderDetail(orderId)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setState({ phase: "ready", order: result.order });
        else setState({ phase: "error", message: result.code === "NOT_FOUND" ? "Order not found." : result.error ?? "Could not load this order." });
      })
      .catch(() => {
        if (!cancelled) setState({ phase: "error", message: "Could not load this order." });
      });
    return () => {
      cancelled = true;
    };
  }, [open, orderId]);

  const title = state.phase === "ready" ? state.order.productName : "Order details";

  // RCCF-72.18D.5.2-C — post-mutation server-truth refresh. Re-reads the
  // canonical projection so the drawer always shows the ACTUAL persisted
  // state (never an optimistic invention). Failures keep the current truth;
  // the mutation's own safe error is surfaced by the controls section.
  const refreshOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const result = await getCreatorOrderDetail(orderId);
      if (result.ok) setState({ phase: "ready", order: result.order });
    } catch {
      /* keep the last known server truth */
    }
  }, [orderId]);

  return (
    <EditDrawer open={open} onClose={onClose} title={title}>
      {state.phase === "loading" && <LoadingSpinner text="Loading order…" />}
      {state.phase === "error" && (
        <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.message}
        </div>
      )}
      {state.phase === "ready" && <OrderDetailBody order={state.order} onOrderRefreshed={refreshOrder} />}
    </EditDrawer>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-zinc-500">{label}</dt>
      <dd className="truncate text-sm text-zinc-200">{value}</dd>
    </div>
  );
}

function OrderDetailBody({ order, onOrderRefreshed }: { order: CreatorOrderDetailView; onOrderRefreshed: () => Promise<void> }) {
  const orderStatus = getOrderStatusPresentation(order.status);
  const refundStatus = getRefundStatusPresentation(order.refund.status);
  const address = order.shippingAddress;
  // RCCF-72.18D.5.2-D — refund outcome notices live at SECTION level so they
  // survive the truth-refresh that may legitimately unmount the initiator
  // (e.g. REFUND_IN_PROGRESS → PENDING renders no action anymore).
  const [refundNotice, setRefundNotice] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  return (
    <div data-testid="order-detail-body">
      {/* Identity + state */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={orderStatus.badgeVariant} size="sm">{orderStatus.label}</Badge>
        <Badge variant="default" size="sm" className="capitalize">{order.productType}</Badge>
        <span className="text-xs text-zinc-500">· {formatOrderDate(order.createdAt)}</span>
      </div>

      <Section label="Order">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Fact label="Product" value={order.productName} />
          <Fact label="Amount" value={formatOrderAmount(order.amount)} />
          <Fact label="Customer" value={order.customerEmail ?? "—"} />
          <Fact label="Commerce mode" value={order.commerceMode} />
          <Fact label="Payment reference" value={<span className="font-mono text-xs">{order.razorpayOrderId ?? "—"}</span>} />
          <Fact label="Payment ID" value={<span className="font-mono text-xs">{order.razorpayPaymentId ?? "—"}</span>} />
        </dl>
      </Section>

      {/* Refund truth — D.5.1 semantics: refundedPaise is ACTUAL refunded money.
          RCCF-72.18D.5.2-D adds the creator-direct initiation flow (D.3/D.4
          pipeline) when the server-derived projection marks the order eligible. */}
      <Section label="Refund">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={refundStatus.badgeVariant} size="sm">{refundStatus.label}</Badge>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          <Fact label="Captured" value={formatPaise(order.originalCapturedPaise)} />
          <Fact label="Refunded" value={formatPaise(order.refund.refundedPaise)} />
          <Fact label="Remaining refundable" value={formatPaise(order.refund.remainingRefundablePaise)} />
          {order.refund.providerRefundId && (
            <Fact label="Provider refund ref" value={<span className="font-mono text-xs">{order.refund.providerRefundId}</span>} />
          )}
          {order.refund.refundedAt && <Fact label="Refunded on" value={formatOrderDate(order.refund.refundedAt)} />}
        </dl>
        {order.refund.eligible && (
          <RefundInitiator order={order} onRefreshed={onOrderRefreshed} onNotice={setRefundNotice} />
        )}
        {!order.refund.eligible && order.refund.status === "PENDING" && (
          <p role="status" data-testid="refund-pending-note" className="mt-3 rounded-lg bg-sky-500/10 px-3 py-1.5 text-xs text-sky-300">
            Refund in progress — reconciliation is handled by the payment provider.
          </p>
        )}
        {refundNotice && (
          <p
            role={refundNotice.tone === "error" ? "alert" : "status"}
            data-testid="refund-notice"
            className={`mt-3 rounded-lg px-3 py-1.5 text-xs ${
              refundNotice.tone === "error"
                ? "border border-red-500/20 bg-red-500/10 text-red-300"
                : "bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {refundNotice.text}
          </p>
        )}
      </Section>

      {/* Fulfillment — server truth; D.5.2-C adds controls for eligible
          physical orders (server action re-authorizes every mutation). */}
      <Section label="Fulfillment">
        {order.fulfillment ? (
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={order.fulfillment.status === "delivered" || order.fulfillment.status === "completed" ? "success" : "info"} size="sm">
                {statusLabel(order.fulfillment.status)}
              </Badge>
              <span className="text-xs capitalize text-zinc-500">{order.fulfillment.type}</span>
            </div>
            {order.fulfillment.type === "physical" && (
              <FulfillmentControls order={order} onRefreshed={onOrderRefreshed} />
            )}
            {(order.fulfillment.trackingNumber || order.fulfillment.courier) && (
              <p className="mt-2 text-sm text-zinc-300">
                {order.fulfillment.courier ?? "Courier"} · <span className="font-mono text-xs">{order.fulfillment.trackingNumber ?? "—"}</span>
              </p>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              <Fact label="Shipped" value={order.fulfillment.shippedAt ? formatOrderDate(order.fulfillment.shippedAt) : "—"} />
              <Fact label="Delivered" value={order.fulfillment.deliveredAt ? formatOrderDate(order.fulfillment.deliveredAt) : "—"} />
            </dl>
            {order.fulfillment.timeline.length > 0 && (
              <ol className="mt-3 space-y-1.5 border-l border-white/10 pl-3">
                {order.fulfillment.timeline.map((t, i) => (
                  <li key={`${t.status}-${i}`} className="text-xs text-zinc-400">
                    <span className="text-zinc-200">{statusLabel(t.status)}</span> · {formatOrderDate(t.at)}
                    {t.by && <span className="text-zinc-600"> · {t.by}</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Fulfillment starts once payment completes.</p>
        )}
      </Section>

      {/* Shipping address — physical orders only (server-enforced projection);
          remains visible after delivery/refund as historical truth. */}
      {order.productType === "physical" && (
        <Section label="Shipping address">
          {address ? (
            <address className="not-italic text-sm leading-relaxed text-zinc-300">
              {address.name && <p>{address.name}</p>}
              {address.phone && <p className="text-zinc-400">{address.phone}</p>}
              {address.line1 && <p>{address.line1}</p>}
              {address.line2 && <p>{address.line2}</p>}
              <p>
                {[address.city, address.state, address.pin].filter(Boolean).join(", ")}
              </p>
              {address.country && <p>{address.country}</p>}
              {address.instructions && <p className="mt-1 text-xs text-zinc-500">“{address.instructions}”</p>}
            </address>
          ) : (
            <p className="text-sm text-zinc-500">No shipping address submitted yet.</p>
          )}
        </Section>
      )}
    </div>
  );
}

// ── RCCF-72.18D.5.2-C — fulfillment mutation controls ────────
// Presentation-only eligibility via the canonical transition table; the server
// action re-validates role, tenant, and legality on every call. Tracking stays
// OPTIONAL exactly as the existing architecture defines it. Every outcome —
// success, rejection, or lost race — ends in a server-truth refresh.
const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--surface-input)] px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20";
const buttonCls = "rounded-lg border border-[var(--color-info-border)] bg-[var(--color-info-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-info)] transition hover:bg-[var(--color-info-surface)] disabled:cursor-not-allowed disabled:opacity-50";

function FulfillmentControls({ order, onRefreshed }: { order: CreatorOrderDetailView; onRefreshed: () => Promise<void> }) {
  const fulfillment = order.fulfillment;
  const controls = useMemo(
    () => (fulfillment ? getFulfillmentControls(fulfillment.type, fulfillment.status) : []),
    [fulfillment],
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [trackingNumber, setTrackingNumber] = useState(fulfillment?.trackingNumber ?? "");
  const [courier, setCourier] = useState(fulfillment?.courier ?? "");

  if (!fulfillment || (controls.length === 0 && !notice)) return null;

  async function apply(next: FulfillmentStatus) {
    if (busy || !fulfillment) return;
    setBusy(true);
    setNotice(null);
    let failure: string | null = null;
    try {
      const r = await updateFulfillmentStatus(fulfillment.id, {
        status: next,
        // Existing architecture treats tracking as optional — preserved here:
        // empty inputs send undefined rather than fabricating a requirement.
        ...(next === "shipped"
          ? { trackingNumber: trackingNumber.trim() || undefined, courier: courier.trim() || undefined }
          : {}),
      });
      if (!r.success) failure = r.error ?? "Could not update this order.";
    } catch {
      failure = "Could not update this order.";
    }
    await onRefreshed();
    setBusy(false);
    setNotice(failure ? { tone: "error", text: failure } : { tone: "success", text: `Marked as ${statusLabel(next)}.` });
  }

  return (
    <div aria-busy={busy} data-testid="fulfillment-controls" className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      {controls.length > 0 && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Manage fulfillment</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="block min-w-0 text-[11px] text-zinc-500">
              Tracking number{" "}
              <span className="text-zinc-600">(optional)</span>
              <input
                className={`mt-1 ${inputCls}`}
                placeholder="e.g. AWB 123456"
                value={trackingNumber}
                disabled={busy}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </label>
            <label className="block min-w-0 text-[11px] text-zinc-500">
              Courier
              <input
                className={`mt-1 ${inputCls}`}
                placeholder="e.g. BlueDart"
                value={courier}
                disabled={busy}
                onChange={(e) => setCourier(e.target.value)}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {controls.map((c) => (
              <button key={c.status} type="button" onClick={() => apply(c.status)} disabled={busy} className={buttonCls}>
                {c.label}
              </button>
            ))}
          </div>
        </>
      )}
      {busy && (
        <p role="status" className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
          <LoadingSpinner size="sm" /> Updating…
        </p>
      )}
      {notice?.tone === "success" && (
        <p role="status" className="mt-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">{notice.text}</p>
      )}
      {notice?.tone === "error" && (
        <p role="alert" className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">{notice.text}</p>
      )}
    </div>
  );
}

// ── RCCF-72.18D.5.2-D — refund initiation (D.3/D.4 pipeline) ─
// Rendered only when the SERVER projection marks the order eligible. The flow
// mirrors the actual backend contract: requestProductOrderRefund performs the
// atomic NONE/PARTIAL/FAILED → PENDING reservation, executeProductOrderRefund
// runs the provider execution — then the drawer ALWAYS re-reads server truth.
// Nothing here is authoritative: every invalid/stale request is rejected by
// the existing D.3/D.4 guards and surfaced as a mapped safe message.

const REFUND_INPUT_CLS = "mt-1 w-full max-w-[16rem] rounded-lg border border-[var(--border)] bg-[var(--surface-input)] px-2.5 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20";

const REFUND_VALIDATION_MESSAGES: Record<string, string> = {
  empty: "Enter an amount.",
  "invalid-format": "Enter a valid amount, e.g. 499.50.",
  "fractional-paise": "Amounts with more than two decimal places are not supported.",
  "non-positive": "Enter an amount greater than zero.",
  "exceeds-remaining": "The entered amount exceeds the remaining refundable amount.",
};

type RefundFlowPhase =
  | { step: "idle" }
  | { step: "confirm"; amountPaise: number };

interface RefundInitiatorProps {
  order: CreatorOrderDetailView;
  onRefreshed: () => Promise<void>;
  onNotice: (notice: { tone: "error" | "info"; text: string } | null) => void;
}

function RefundInitiator({ order, onRefreshed, onNotice }: RefundInitiatorProps) {
  const [phase, setPhase] = useState<RefundFlowPhase>({ step: "idle" });
  const [amountInput, setAmountInput] = useState("");
  const [busy, setBusy] = useState(false);

  const remaining = order.refund.remainingRefundablePaise;
  const fulfillmentState = order.fulfillment?.status ?? null;
  const alreadyMovingNote =
    fulfillmentState && ["shipped", "delivered", "returned"].includes(fulfillmentState)
      ? `This order has already been ${fulfillmentState}. Refund handling does not automatically change fulfillment status.`
      : fulfillmentState
        ? `Fulfillment state: ${statusLabel(fulfillmentState)}. Refund handling does not automatically change fulfillment status.`
        : null;

  function requestConfirmation() {
    if (busy) return;
    onNotice(null);
    const parsed = parseRefundAmountInput(amountInput, remaining);
    if (!parsed.ok) {
      onNotice({ tone: "error", text: REFUND_VALIDATION_MESSAGES[parsed.reason] });
      return;
    }
    setPhase({ step: "confirm", amountPaise: parsed.paise });
  }

  async function confirmRefund() {
    if (busy || phase.step !== "confirm") return;
    const { amountPaise } = phase;
    setBusy(true);
    onNotice(null);
    let failure: string | null = null;

    try {
      // Step 1 — D.3: reserve via the atomic status transition (server-authoritative).
      const requested = await requestProductOrderRefund({ orderId: order.id, amount: amountPaise });
      if (!requested.success) {
        failure = getRefundErrorMessage(requested.code);
      } else {
        // Step 2 — D.4: execute through the creator's own Razorpay account.
        const executed = await executeProductOrderRefund({ orderId: order.id, amount: amountPaise });
        if (!executed.success) failure = getRefundErrorMessage(executed.code);
      }
    } catch {
      failure = getRefundErrorMessage();
    }

    // Step 3 — always re-read server truth; never leave stale totals visible.
    await onRefreshed();
    setBusy(false);
    setPhase({ step: "idle" });
    setAmountInput("");
    if (failure) onNotice({ tone: "error", text: failure });
  }

  return (
    <div aria-busy={busy} data-testid="refund-initiator" className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Request a refund</p>
      <label className="mt-2 block text-[11px] text-zinc-500">
        Amount to refund (₹) — up to {formatPaise(remaining)}
        <input
          type="text"
          inputMode="decimal"
          className={REFUND_INPUT_CLS}
          placeholder={`e.g. ${formatPaise(remaining)}`}
          value={amountInput}
          disabled={busy}
          onChange={(e) => setAmountInput(e.target.value)}
        />
      </label>

      {phase.step === "idle" && (
        <button type="button" onClick={requestConfirmation} disabled={busy} className={`${buttonCls} mt-3`}>
          Request Refund
        </button>
      )}

      {phase.step === "confirm" && (
        <div data-testid="refund-confirm" className="mt-3 rounded-lg border border-white/10 bg-zinc-900/60 p-3 text-xs text-zinc-300">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Confirm refund</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
            <Fact label="Order" value={<span className="font-mono">{order.id}</span>} />
            <Fact label="Refund amount" value={formatPaise(phase.amountPaise)} />
            <Fact label="Remaining after" value={formatPaise(Math.max(0, remaining - phase.amountPaise))} />
            <Fact label="Fulfillment state" value={fulfillmentState ? statusLabel(fulfillmentState) : "Unfulfilled"} />
            <Fact label="Current refund state" value={getRefundStatusPresentation(order.refund.status).label} />
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={confirmRefund} disabled={busy} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50">
              Confirm Refund
            </button>
            <button type="button" onClick={() => !busy && setPhase({ step: "idle" })} disabled={busy} className={buttonCls}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {alreadyMovingNote && (
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{alreadyMovingNote}</p>
      )}
      {busy && (
        <p role="status" className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
          <LoadingSpinner size="sm" /> Processing refund…
        </p>
      )}
    </div>
  );
}
