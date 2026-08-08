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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bookings</h1>
          <p className="mt-1 text-sm text-zinc-400">Manage your calendar-based bookings and appointments.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600">{showForm ? "Cancel" : "New Booking"}</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Confirmed</p><p className="text-xl font-bold text-emerald-400">{confirmed}</p></div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Pending</p><p className="text-xl font-bold text-amber-400">{pending}</p></div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Revenue</p><p className="text-xl font-bold text-white">{formatCurrency(revenue)}</p></div>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input type="number" className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300" placeholder="Price (₹)" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            <input type="number" className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300" placeholder="Duration (min)" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
            <input type="date" className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300" value={form.slotDate} onChange={(e) => setForm({ ...form, slotDate: e.target.value })} />
            <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300" placeholder="Start time (HH:MM)" value={form.slotStart} onChange={(e) => setForm({ ...form, slotStart: e.target.value })} />
            <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300" placeholder="Customer Name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300" placeholder="Customer Email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
            <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300" placeholder="Customer Phone" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
            <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button onClick={handleCreate} disabled={loading} className="mt-3 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-50">{loading ? "Creating..." : "Create Booking"}</button>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-zinc-900/50">
        {bookings.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">No bookings yet. Create your first booking to start accepting appointments.</div>
        ) : (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-white/5 text-zinc-500"><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Time</th><th className="px-4 py-3 text-left">Title</th><th className="px-4 py-3 text-left">Customer</th><th className="px-4 py-3 text-left">Price</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Actions</th></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-white/5 text-zinc-300 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">{new Date(b.slotDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{b.slotStart} - {b.slotEnd}</td>
                  <td className="px-4 py-3 font-medium">{b.title}</td>
                  <td className="px-4 py-3">{b.customerName || "—"}{b.customerEmail ? ` · ${b.customerEmail}` : ""}</td>
                  <td className="px-4 py-3">{formatCurrency(b.price)}</td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[b.status] ?? ""}`}>{b.status}</span></td>
                  <td className="px-4 py-3">
                    {b.status === "pending" && <button onClick={() => handleApprove(b.id)} className="text-emerald-400 hover:underline text-xs mr-2">Approve</button>}
                    {(b.status === "pending" || b.status === "confirmed") && <button onClick={() => handleCancel(b.id)} className="text-red-400 hover:underline text-xs">Cancel</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
