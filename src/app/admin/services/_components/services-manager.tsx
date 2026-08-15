"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, CalendarPlus } from "lucide-react";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { CrudTable } from "@/features/_shared/components/crud-table";
import { EditDrawer } from "@/features/_shared/components/edit-drawer";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { MediaField } from "@/components/shared/MediaField";
import type { Column } from "@/features/_shared/components/crud-table";
import type { ServiceData, ServiceFormInput } from "@/features/services/types";
import { createService, updateService, deleteService, createServiceBookingSlot } from "@/features/services/actions";
import { formatCurrency } from "@/lib/utils";

interface ServicesManagerProps {
  initialData: ServiceData[];
}

export function ServicesManager({ initialData }: ServicesManagerProps) {
  const [items, setItems] = useState<ServiceData[]>(initialData);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceData | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ServiceFormInput>({ title: "", price: 0, status: "PUBLISHED", bookable: false });
  const [slotForm, setSlotForm] = useState<{ serviceId: string; slotDate: string; slotStart: string; slotEnd: string; approvalRequired: boolean }>({ serviceId: "", slotDate: "", slotStart: "10:00", slotEnd: "11:00", approvalRequired: true });
  const [slotMsg, setSlotMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [slotSaving, setSlotSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", price: 0, status: "PUBLISHED", bookable: false });
    setDrawerOpen(true);
  };

  const openEdit = (item: ServiceData) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description ?? undefined,
      price: item.price,
      duration: item.duration ?? undefined,
      imageUrl: item.imageUrl ?? undefined,
      category: item.category ?? undefined,
      featured: item.featured,
      status: item.status,
      bookable: item.bookable,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateService(editing.id, form);
        setItems((prev) => prev.map((s) => (s.id === editing.id ? updated : s)));
      } else {
        const created = await createService(form);
        setItems((prev) => [created, ...prev]);
      }
      setDrawerOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteService(id);
    setItems((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCreateSlot = async () => {
    if (!slotForm.serviceId || !slotForm.slotDate || !slotForm.slotStart || !slotForm.slotEnd) return;
    setSlotSaving(true);
    setSlotMsg(null);
    const res = await createServiceBookingSlot(slotForm);
    setSlotMsg(res.success ? { ok: true, text: "Slot created." } : { ok: false, text: res.error ?? "Failed to create slot." });
    setSlotSaving(false);
  };

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "title",
      header: "Title",
      render: (r: Record<string, unknown>) => {
        const d = r as unknown as ServiceData;
        return (
          <span className="flex items-center gap-2">
            {d.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
            )}
            <span className="font-medium text-zinc-200">{d.title}</span>
          </span>
        );
      },
      sortable: true,
    },
    {
      key: "status",
      header: "Status",
      render: (r: Record<string, unknown>) => {
        const d = r as unknown as ServiceData;
        return <Badge variant={d.status === "PUBLISHED" ? "default" : "warning"}>{d.status}</Badge>;
      },
    },
    {
      key: "bookable",
      header: "Bookable",
      render: (r: Record<string, unknown>) => {
        const d = r as unknown as ServiceData;
        return d.bookable
          ? <Badge variant="default">Bookable</Badge>
          : <span className="text-xs text-zinc-500">Display only</span>;
      },
    },
    {
      key: "price",
      header: "Price",
      render: (r: Record<string, unknown>) => formatCurrency((r as unknown as ServiceData).price),
      sortable: true,
    },
    {
      key: "duration",
      header: "Duration",
      render: (r: Record<string, unknown>) => {
        const d = r as unknown as ServiceData;
        return <span className="text-xs text-zinc-500">{d.duration ?? "—"}</span>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (r: Record<string, unknown>) => {
        const d = r as unknown as ServiceData;
        return (
          <div className="flex items-center gap-2">
            {d.bookable && (
              <button onClick={() => { setSlotForm((f) => ({ ...f, serviceId: d.id })); }} className="rounded-lg p-1.5 text-indigo-400 hover:bg-indigo-500/10" aria-label={`Add availability for ${d.title}`}>
                <CalendarPlus className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => openEdit(d)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200" aria-label={`Edit ${d.title}`}>
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => handleDelete(d.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400" aria-label={`Delete ${d.title}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <FeaturePage
      title="Services"
      description="Manage your service offerings."
      actions={
        <button onClick={openCreate} className="btn-primary text-xs">
          <Plus className="h-4 w-4" /> Add Service
        </button>
      }
    >
      <CrudTable
        columns={columns}
        data={items as unknown as Record<string, unknown>[]}
        keyExtractor={(r) => (r as unknown as ServiceData).id}
        searchable
        searchKeys={["title"]}
        emptyMessage="No services yet. Create your first service."
      />

      {slotForm.serviceId && (
        <div className="mt-6 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-sm font-semibold text-white">Add availability for {items.find((s) => s.id === slotForm.serviceId)?.title ?? "service"}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input type="date" className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300" value={slotForm.slotDate} onChange={(e) => setSlotForm((f) => ({ ...f, slotDate: e.target.value }))} />
            <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300" placeholder="Start (HH:MM)" value={slotForm.slotStart} onChange={(e) => setSlotForm((f) => ({ ...f, slotStart: e.target.value }))} />
            <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300" placeholder="End (HH:MM)" value={slotForm.slotEnd} onChange={(e) => setSlotForm((f) => ({ ...f, slotEnd: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={slotForm.approvalRequired} onChange={(e) => setSlotForm((f) => ({ ...f, approvalRequired: e.target.checked }))} className="rounded border-white/10" />
              Require approval
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={handleCreateSlot} disabled={slotSaving} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-50">
              {slotSaving ? "Creating…" : "Create Slot"}
            </button>
            <button onClick={() => setSlotForm((f) => ({ ...f, serviceId: "" }))} className="text-xs text-zinc-500 hover:text-zinc-300">Cancel</button>
            {slotMsg && <span className={`text-xs ${slotMsg.ok ? "text-emerald-400" : "text-red-400"}`}>{slotMsg.text}</span>}
          </div>
        </div>
      )}

      <EditDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit ${editing.title}` : "New Service"}
        isSaving={saving}
      >
        <div className="space-y-4">
          <MediaField
            label="Image"
            value={{ url: form.imageUrl ?? null }}
            folder="services"
            accept="image/*"
            entityType="service"
            entityId={editing?.id}
            onChange={(v) => setForm((f) => ({ ...f, imageUrl: v?.url ?? undefined }))}
          />
          <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description" value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (₹)" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
            <Input label="Duration" value={form.duration ?? ""} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="e.g. 45 min" />
          </div>
          <Input label="Category" value={form.category ?? ""} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.featured ?? false} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} className="rounded border-white/10" />
            <span className="text-sm text-zinc-300">Featured on storefront</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.bookable ?? false} onChange={(e) => setForm((f) => ({ ...f, bookable: e.target.checked }))} className="rounded border-white/10" />
            <span className="text-sm text-zinc-300">Bookable — customers can book available appointments</span>
          </label>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-400">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ServiceFormInput["status"] }))}
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-zinc-600"
            >
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="flex gap-4">
            <button onClick={handleSave} disabled={saving || !form.title} className="btn-primary flex-1 text-sm">
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </button>
            <button onClick={() => setDrawerOpen(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      </EditDrawer>
    </FeaturePage>
  );
}
