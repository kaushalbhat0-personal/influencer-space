"use client";

import { useState } from "react";
import { createBooking, approveBooking, cancelBooking, getBookingSlots } from "@/actions/booking.actions";
import { formatCurrency } from "@/lib/utils";

interface Booking {
  id: string;
  title: string;
  price: number;
  duration: number;
  slotDate: Date;
  slotStart: string;
  slotEnd: string;
  status: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
  approvalRequired: boolean;
  offering?: { id: string; title: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  confirmed: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
  completed: "bg-blue-500/20 text-blue-400",
};

export function BookingsClient({ initialBookings, tenantId }: { initialBookings: Booking[]; tenantId: string }) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [form, setForm] = useState({ title: "", description: "", price: 0, duration: 60, slotDate: "", slotStart: "09:00", customerName: "", customerEmail: "", customerPhone: "", notes: "" });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!form.title || !form.slotDate) return;
    setLoading(true);
    const res = await createBooking(form);
    if (res.success && res.booking) {
      setBookings((prev) => [...prev, res.booking as unknown as Booking].sort((a, b) => new Date(a.slotDate).getTime() - new Date(b.slotDate).getTime()));
      setShowForm(false);
    }
    setLoading(false);
  }

  async function handleApprove(id: string) {
    await approveBooking(id);
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "confirmed" } : b));
  }

  async function handleCancel(id: string) {
    await cancelBooking(id);
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "cancelled" } : b));
  }

  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const pending = bookings.filter((b) => b.status === "pending").length;
  const revenue = bookings.filter((b) => b.status === "confirmed").reduce((s, b) => s + b.price, 0);

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bookings</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Manage your calendar-based bookings and appointments.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="shrink-0 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]">{showForm ? "Cancel" : "New Booking"}</button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-card)] p-4"><p className="text-xs text-[var(--text-muted)]">Confirmed</p><p className="text-xl font-bold text-emerald-400">{confirmed}</p></div>
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-card)] p-4"><p className="text-xs text-[var(--text-muted)]">Pending</p><p className="text-xl font-bold text-amber-400">{pending}</p></div>
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-card)] p-4"><p className="text-xs text-[var(--text-muted)]">Revenue</p><p className="text-xl font-bold text-white">{formatCurrency(revenue)}</p></div>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-[var(--text-primary)]" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-[var(--text-primary)]" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input type="number" className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-[var(--text-primary)]" placeholder="Price (₹)" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            <input type="number" className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-[var(--text-primary)]" placeholder="Duration (min)" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
            <input type="date" className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-[var(--text-primary)]" value={form.slotDate} onChange={(e) => setForm({ ...form, slotDate: e.target.value })} />
            <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-[var(--text-primary)]" placeholder="Start time (HH:MM)" value={form.slotStart} onChange={(e) => setForm({ ...form, slotStart: e.target.value })} />
            <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-[var(--text-primary)]" placeholder="Customer Name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-[var(--text-primary)]" placeholder="Customer Email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
            <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-[var(--text-primary)]" placeholder="Customer Phone" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
            <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-[var(--text-primary)]" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button onClick={handleCreate} disabled={loading} className="mt-3 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">{loading ? "Creating..." : "Create Booking"}</button>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-zinc-900/50">
        {bookings.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">No bookings yet. Create your first booking to start accepting appointments.</div>
        ) : (
          <>
            {/* Desktop — tabular layout preserved exactly */}
            <table className="hidden w-full text-xs md:table">
              <thead><tr className="border-b border-white/5 text-[var(--text-muted)]"><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Time</th><th className="px-4 py-3 text-left">Title</th><th className="px-4 py-3 text-left">Customer</th><th className="px-4 py-3 text-left">Price</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Actions</th></tr></thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-white/5 text-[var(--text-primary)] hover:bg-white/[0.02]">
                    <td className="px-4 py-3">{new Date(b.slotDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{b.slotStart} - {b.slotEnd}</td>
                    <td className="px-4 py-3 font-medium">{b.title}{b.offering ? <span className="ml-2 rounded bg-[var(--color-info-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-info)] border border-[var(--color-info-border)]">Service</span> : null}</td>
                    <td className="px-4 py-3">{b.customerName || "—"}{b.customerEmail ? ` · ${b.customerEmail}` : ""}</td>
                    <td className="px-4 py-3">{formatCurrency(b.price)}</td>
                    <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[b.status] ?? ""}`}>{b.status}</span></td>
                    <td className="px-4 py-3">
                      <BookingActions b={b} onApprove={handleApprove} onCancel={handleCancel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile — readable cards, every field preserved, touch actions */}
            <div className="divide-y divide-white/5 md:hidden">
              {bookings.map((b) => (
                <div key={b.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{b.title}</p>
                        {b.offering ? <span className="rounded bg-[var(--color-info-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-info)] border border-[var(--color-info-border)]">Service</span> : null}
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {new Date(b.slotDate).toLocaleDateString()} · {b.slotStart} - {b.slotEnd}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {b.customerName || "—"}{b.customerEmail ? ` · ${b.customerEmail}` : ""}
                        {b.customerPhone ? ` · ${b.customerPhone}` : ""}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[b.status] ?? ""}`}>{b.status}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(b.price)}</p>
                    <BookingActions b={b} onApprove={handleApprove} onCancel={handleCancel} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BookingActions({
  b,
  onApprove,
  onCancel,
}: {
  b: Booking;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 md:gap-2">
      {b.status === "pending" && (
        <button onClick={() => onApprove(b.id)} aria-label={`Approve booking ${b.title}`} className="rounded-md bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25">
          Approve
        </button>
      )}
      {(b.status === "pending" || b.status === "confirmed") && (
        <button onClick={() => onCancel(b.id)} aria-label={`Cancel booking ${b.title}`} className="rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10">
          Cancel
        </button>
      )}
    </div>
  );
}
