// @vitest-environment jsdom
/**
 * RCCF-72.18D.5.2-D — Refund Initiation UI (drawer)
 *
 * Consumer-layer coverage on top of D.5.2-A truth + D.5.2-B/C drawer:
 *   - the initiator renders ONLY when the SERVER projection marks eligible
 *   - PENDING renders "Refund in progress", never a second initiation
 *   - amounts (captured/refunded/remaining) always come from server truth and
 *     are REPLACED after every outcome via a truth refresh
 *   - confirmation step shows order id, amount, remaining-after, fulfillment
 *     state, refund state — no execution on first click, no timers
 *   - exactly one server action sequence per confirmed intent (double-submit
 *     safe); server guards remain authoritative
 *   - known error codes map to safe messages; unknown degrade to generic
 *   - fulfillment disclosure never mutates fulfillment
 *   - credential safety across the whole rendered surface
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  getCreatorOrderDetail: vi.fn(),
  updateFulfillmentStatus: vi.fn(),
  requestProductOrderRefund: vi.fn(),
  executeProductOrderRefund: vi.fn(),
}));

vi.mock("@/actions/order.actions", () => ({
  getCreatorOrderDetail: h.getCreatorOrderDetail,
}));
vi.mock("@/actions/fulfillment.actions", () => ({
  updateFulfillmentStatus: h.updateFulfillmentStatus,
}));
vi.mock("@/actions/payment-account.actions", () => ({
  requestProductOrderRefund: h.requestProductOrderRefund,
  executeProductOrderRefund: h.executeProductOrderRefund,
}));

import { OrdersTable } from "@/app/admin/orders/_components/orders-table";
import type { CreatorOrderDetailView } from "@/actions/order.actions";

const TABLE_ROWS = [
  {
    id: "ord-1",
    productName: "Bass Preset Pack",
    amount: 999,
    status: "COMPLETED",
    fanEmail: "buyer@example.com",
    razorpayOrderId: "order_X1",
    createdAt: new Date("2026-07-30T00:00:00Z").toISOString(),
  },
];

function makeDetail(over: Partial<CreatorOrderDetailView> = {}): CreatorOrderDetailView {
  return {
    id: "ord-1",
    amount: 999,
    originalCapturedPaise: 99900,
    status: "COMPLETED",
    commerceMode: "ONLINE",
    productName: "Bass Preset Pack",
    productType: "physical",
    customerEmail: "buyer@example.com",
    createdAt: "2026-07-30T00:00:00.000Z",
    razorpayOrderId: "order_X1",
    razorpayPaymentId: "pay_X1",
    refund: {
      status: "NONE",
      refundedPaise: 0,
      remainingRefundablePaise: 99900,
      providerRefundId: null,
      refundedAt: null,
      eligible: true,
    },
    fulfillment: {
      id: "ful-1",
      type: "physical",
      status: "pending",
      trackingNumber: null,
      courier: null,
      carrierNotes: null,
      shippedAt: null,
      deliveredAt: null,
      timeline: [{ status: "pending", at: "2026-07-30T00:00:00.000Z" }],
    },
    shippingAddress: {
      id: "addr-1",
      name: "Buyer Name",
      line1: "12 MG Road",
      city: "Mumbai",
      state: "Maharashtra",
      pin: "400001",
      country: "India",
    },
    ...over,
  };
}

function openDrawer() {
  const rows = screen.getAllByRole("row");
  const dataRow = rows.find((r) => r.textContent?.includes("Bass Preset Pack"))!;
  fireEvent.click(dataRow);
}

async function openEligibleDrawer(order?: CreatorOrderDetailView) {
  h.getCreatorOrderDetail.mockResolvedValue({ ok: true, order: order ?? makeDetail() });
  render(<OrdersTable orders={TABLE_ROWS} />);
  openDrawer();
  await waitFor(() => expect(screen.getByTestId("refund-initiator")).toBeTruthy());
}

/** Opens the drawer for ANY projection (eligible or not) and waits for truth. */
async function openDrawerWith(order: CreatorOrderDetailView) {
  h.getCreatorOrderDetail.mockResolvedValue({ ok: true, order });
  render(<OrdersTable orders={TABLE_ROWS} />);
  openDrawer();
  await waitFor(() => expect(screen.getByTestId("order-detail-body")).toBeTruthy());
}

function typeAmount(value: string) {
  fireEvent.change(screen.getByLabelText(/Amount to refund/i), { target: { value } });
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ── Eligibility ──────────────────────────────────────────────

describe("RCCF-72.18D.5.2-D — eligibility rendering", () => {
  it.each([
    ["NONE", false],
    ["PARTIAL", false],
    ["FAILED", false],
  ])("%s with remaining headroom → initiator available", async (status) => {
    await openEligibleDrawer(makeDetail({ refund: { ...makeDetail().refund, status } }));
    expect(screen.getByRole("button", { name: "Request Refund" })).toBeTruthy();
  });

  it.each([
    ["REFUNDED"],
    ["PENDING"],
  ])("%s → no initiator", async (status) => {
    await openDrawerWith(
      makeDetail({
        refund: {
          ...makeDetail().refund,
          status,
          eligible: false,
          refundedPaise: status === "REFUNDED" ? 99900 : 0,
          remainingRefundablePaise: status === "REFUNDED" ? 0 : 99900,
        },
      }),
    );
    expect(screen.queryByTestId("refund-initiator")).toBeNull();
    expect(screen.queryByRole("button", { name: "Request Refund" })).toBeNull();
  });

  it("PENDING shows the canonical in-progress note instead of an action", async () => {
    await openDrawerWith(makeDetail({ refund: { ...makeDetail().refund, status: "PENDING", eligible: false } }));
    const note = screen.getByTestId("refund-pending-note");
    expect(note.textContent).toContain("Refund in progress");
    expect(note.getAttribute("role")).toBe("status");
  });
});

// ── Amount display from server truth ─────────────────────────

describe("RCCF-72.18D.5.2-D — amount display derives from server projection", () => {
  it("shows captured, refunded, and remaining amounts", async () => {
    await openEligibleDrawer(
      makeDetail({
        originalCapturedPaise: 100000,
        refund: { status: "PARTIAL", refundedPaise: 25000, remainingRefundablePaise: 75000, providerRefundId: null, refundedAt: null, eligible: true },
      }),
    );
    expect(screen.getByText("Captured")).toBeTruthy();
    expect(screen.getByText("₹1,000")).toBeTruthy();
    expect(screen.getByText("₹250")).toBeTruthy();
    expect(screen.getByText("₹750")).toBeTruthy();
  });
});

// ── Confirmation UX ──────────────────────────────────────────

describe("RCCF-72.18D.5.2-D — confirmation before execution", () => {
  it("first click only opens confirmation; nothing executes without explicit confirm", async () => {
    await openEligibleDrawer();
    typeAmount("499.50");
    fireEvent.click(screen.getByRole("button", { name: "Request Refund" }));

    const confirm = await screen.findByTestId("refund-confirm");
    expect(confirm.textContent).toContain("ord-1"); // order identifier
    expect(confirm.textContent).toContain("₹499.5"); // refund amount (en-IN drops the trailing zero)
    expect(confirm.textContent).toContain("Remaining after"); // remaining refundable math
    expect(confirm.textContent).toContain("Pending"); // current fulfillment state label
    expect(confirm.textContent).toContain("No refund"); // current refund state
    expect(h.requestProductOrderRefund).not.toHaveBeenCalled();
    expect(h.executeProductOrderRefund).not.toHaveBeenCalled();
  });

  it("confirming runs request → execute with integer paise and refreshes truth", async () => {
    h.requestProductOrderRefund.mockResolvedValue({ success: true });
    h.executeProductOrderRefund.mockResolvedValue({ success: true, totalRefundedPaise: 49950 });
    const refreshed = makeDetail({
      refund: { status: "PARTIAL", refundedPaise: 49950, remainingRefundablePaise: 49950, providerRefundId: "rfnd_9", refundedAt: "2026-08-21T00:00:00.000Z", eligible: true },
    });
    h.getCreatorOrderDetail
      .mockResolvedValueOnce({ ok: true, order: makeDetail() })
      .mockResolvedValueOnce({ ok: true, order: refreshed });

    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawer();
    await waitFor(() => expect(screen.getByTestId("refund-initiator")).toBeTruthy());

    typeAmount("499.50");
    fireEvent.click(screen.getByRole("button", { name: "Request Refund" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm Refund" }));

    await waitFor(() =>
      expect(h.requestProductOrderRefund).toHaveBeenCalledWith({ orderId: "ord-1", amount: 49950 }),
    );
    expect(h.executeProductOrderRefund).toHaveBeenCalledWith({ orderId: "ord-1", amount: 49950 });
    // Server-truth refresh replaced displayed values.
    await waitFor(() => expect(h.getCreatorOrderDetail).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText("Partially refunded")).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("cancel returns to idle without any server call", async () => {
    await openEligibleDrawer();
    typeAmount("100");
    fireEvent.click(screen.getByRole("button", { name: "Request Refund" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(screen.queryByTestId("refund-confirm")).toBeNull();
    expect(h.requestProductOrderRefund).not.toHaveBeenCalled();
  });
});

// ── Idempotency / double submit ──────────────────────────────

describe("RCCF-72.18D.5.2-D — double-submit safety", () => {
  it("double click during flight results in exactly one request sequence", async () => {
    h.requestProductOrderRefund.mockImplementation(() => new Promise(() => {})); // never resolves
    await openEligibleDrawer();

    typeAmount("250");
    fireEvent.click(screen.getByRole("button", { name: "Request Refund" }));
    const confirmButton = (await screen.findByRole("button", { name: "Confirm Refund" })) as HTMLButtonElement;
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(h.requestProductOrderRefund).toHaveBeenCalledTimes(1);
    expect(h.executeProductOrderRefund).not.toHaveBeenCalled(); // sequential contract respected
    expect(confirmButton.disabled).toBe(true);
  });
});

// ── Failure paths & concurrency ──────────────────────────────

describe("RCCF-72.18D.5.2-D — failure, pending and stale-state handling", () => {
  it("maps REFUND_IN_PROGRESS to a safe message and refreshes truth", async () => {
    h.requestProductOrderRefund.mockResolvedValue({ success: false, code: "REFUND_IN_PROGRESS" });
    h.getCreatorOrderDetail
      .mockResolvedValueOnce({ ok: true, order: makeDetail() })
      .mockResolvedValueOnce({
        ok: true,
        order: makeDetail({ refund: { ...makeDetail().refund, status: "PENDING", eligible: false } }),
      });

    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawer();
    await waitFor(() => expect(screen.getByTestId("refund-initiator")).toBeTruthy());

    typeAmount("250");
    fireEvent.click(screen.getByRole("button", { name: "Request Refund" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm Refund" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("already in progress");
    await waitFor(() => expect(h.getCreatorOrderDetail).toHaveBeenCalledTimes(2));
    // Truth replaced: initiator gone, canonical pending note shown.
    await waitFor(() => expect(screen.getByTestId("refund-pending-note")).toBeTruthy());
    expect(h.executeProductOrderRefund).not.toHaveBeenCalled();
  });

  it("provider failure surfaces the mapped retry-safe message with refreshed FAILED state", async () => {
    h.requestProductOrderRefund.mockResolvedValue({ success: true });
    h.executeProductOrderRefund.mockResolvedValue({ success: false, code: "PROVIDER_ERROR" });
    h.getCreatorOrderDetail
      .mockResolvedValueOnce({ ok: true, order: makeDetail() })
      .mockResolvedValueOnce({ ok: true, order: makeDetail({ refund: { ...makeDetail().refund, status: "FAILED", eligible: true } }) });

    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawer();
    await waitFor(() => expect(screen.getByTestId("refund-initiator")).toBeTruthy());

    typeAmount("250");
    fireEvent.click(screen.getByRole("button", { name: "Request Refund" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm Refund" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("refund attempt failed");
    expect(alert.textContent.toLowerCase()).not.toContain("razorpay");
    await waitFor(() => expect(h.getCreatorOrderDetail).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getAllByText("Refund failed").length).toBeGreaterThan(0));
    // Retry remains available because the server still reports headroom.
    expect(screen.getByRole("button", { name: "Request Refund" })).toBeTruthy();
  });

  it("stale submission under concurrent modification refreshes actual state (no stale totals)", async () => {
    h.requestProductOrderRefund.mockResolvedValue({ success: false, code: "CONCURRENT_MODIFICATION" });
    h.getCreatorOrderDetail
      .mockResolvedValueOnce({ ok: true, order: makeDetail() })
      .mockResolvedValueOnce({
        ok: true,
        order: makeDetail({ refund: { status: "REFUNDED", refundedPaise: 99900, remainingRefundablePaise: 0, providerRefundId: "rfnd_full", refundedAt: "2026-08-21T09:00:00.000Z", eligible: false } }),
      });

    render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawer();
    await waitFor(() => expect(screen.getByTestId("refund-initiator")).toBeTruthy());

    typeAmount("250");
    fireEvent.click(screen.getByRole("button", { name: "Request Refund" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm Refund" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("changed while you were working");
    await waitFor(() => expect(h.getCreatorOrderDetail).toHaveBeenCalledTimes(2));
    // Stale totals replaced by server truth: fully refunded → ₹0 remaining,
    // no initiator, no retry.
    await waitFor(() => expect(screen.getByText("₹0")).toBeTruthy());
    expect(screen.queryByTestId("refund-initiator")).toBeNull();
  });

  it("never renders raw internals when actions throw", async () => {
    h.requestProductOrderRefund.mockRejectedValue(new Error("prisma: P2002 duplicate key"));
    await openEligibleDrawer();

    typeAmount("250");
    fireEvent.click(screen.getByRole("button", { name: "Request Refund" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm Refund" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Something went wrong. Please try again.");
    expect(alert.textContent).not.toMatch(/prisma|P\d{4}/i);
  });
});

// ── Client-side validation mirrors §8 rules ──────────────────

describe("RCCF-72.18D.5.2-D — amount validation before any server call", () => {
  async function expectRejected(raw: string, messagePart: string) {
    await openEligibleDrawer();
    typeAmount(raw);
    fireEvent.click(screen.getByRole("button", { name: "Request Refund" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(messagePart);
    expect(h.requestProductOrderRefund).not.toHaveBeenCalled();
    cleanup();
  }

  it("rejects empty", async () => { await expectRejected("", "Enter an amount."); });
  it("rejects non-numeric/negative", async () => { await expectRejected("-5", "valid amount"); });
  it("rejects NaN-ish words", async () => { await expectRejected("abc", "valid amount"); });
  it("rejects fractional paise", async () => { await expectRejected("10.555", "two decimal places"); });
  it("rejects zero", async () => { await expectRejected("0", "greater than zero"); });
  it("rejects amounts above remaining", async () => { await expectRejected("2000", "exceeds the remaining"); });
});

// ── Fulfillment disclosure ───────────────────────────────────

describe("RCCF-72.18D.5.2-D — fulfillment disclosure (informational only)", () => {
  it.each([
    // [state, disclosure fragment, progression controls still offered?]
    ["shipped", "already been shipped", true],
    ["delivered", "already been delivered", false], // terminal for progression — controls legitimately absent
    ["returned", "already been returned", false],
    ["pending", "Fulfillment state: Pending.", true],
  ] as Array<[string, string, boolean]>)("discloses %s without blocking or mutating", async (state, expectedFragment, controlsExpected) => {
    await openEligibleDrawer(makeDetail({ fulfillment: { ...makeDetail().fulfillment!, status: state } }));
    const note = screen.getByText(new RegExp(expectedFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    expect(note.textContent).toContain("does not automatically change fulfillment status");
    // The D.5.2-C fulfillment controls remain exactly as that ticket defined:
    // present while the canonical machine offers a next step, absent otherwise.
    if (controlsExpected) expect(screen.getByTestId("fulfillment-controls")).toBeTruthy();
    else expect(screen.queryByTestId("fulfillment-controls")).toBeNull();
  });

  it("unfulfilled orders show Unfulfilled inside the confirmation panel", async () => {
    await openEligibleDrawer(makeDetail({ fulfillment: null, shippingAddress: null }));
    typeAmount("100");
    fireEvent.click(screen.getByRole("button", { name: "Request Refund" }));
    const confirm = await screen.findByTestId("refund-confirm");
    expect(confirm.textContent).toContain("Unfulfilled");
  });
});

// ── Credential safety ────────────────────────────────────────

describe("RCCF-72.18D.5.2-D — credential safety", () => {
  it("renders no secrets anywhere in the drawer", async () => {
    h.requestProductOrderRefund.mockResolvedValue({ success: true });
    h.executeProductOrderRefund.mockResolvedValue({ success: true, totalRefundedPaise: 10000 });
    h.getCreatorOrderDetail
      .mockResolvedValueOnce({ ok: true, order: makeDetail() })
      .mockResolvedValue({ ok: true, order: makeDetail() });

    const { container } = render(<OrdersTable orders={TABLE_ROWS} />);
    openDrawer();
    await waitFor(() => expect(screen.getByTestId("refund-initiator")).toBeTruthy());
    typeAmount("100");
    fireEvent.click(screen.getByRole("button", { name: "Request Refund" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm Refund" }));
    await waitFor(() => expect(h.getCreatorOrderDetail).toHaveBeenCalledTimes(2));

    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain("providerkey");
    expect(html).not.toContain("providersecret");
    expect(html).not.toContain("encrypted");
    expect(html).not.toContain("paymentaccountid");
    expect(html).not.toContain('"tenantid"');
  });
});
