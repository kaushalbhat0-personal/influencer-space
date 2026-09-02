"use client";

import { useState } from "react";
import { Plus, Star, Trash2, Pencil } from "lucide-react";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { CrudTable } from "@/features/_shared/components/crud-table";
import { EditDrawer } from "@/features/_shared/components/edit-drawer";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PackageOpen } from "lucide-react";
import { MediaField } from "@/components/shared/MediaField";
import type { Column } from "@/features/_shared/components/crud-table";
import type { TestimonialData, TestimonialFormInput } from "../types";
import { createTestimonial, deleteTestimonial, updateTestimonial } from "../actions";

interface TestimonialsPageProps {
  initialData: TestimonialData[];
  tenantId: string;
}

export function TestimonialsPage({ initialData, tenantId }: TestimonialsPageProps) {
  const [items, setItems] = useState<TestimonialData[]>(initialData);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<TestimonialData | null>(null);
  const [form, setForm] = useState<TestimonialFormInput>({ author: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TestimonialData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setError(null);
    setForm({ author: "", content: "" });
    setDrawerOpen(true);
  };

  const openEdit = (item: TestimonialData) => {
    setEditing(item);
    setError(null);
    setForm({
      author: item.author,
      role: item.role ?? undefined,
      content: item.content,
      avatarUrl: item.avatarUrl ?? undefined,
      rating: item.rating,
      featured: item.featured,
      category: item.category ?? undefined,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const updated = await updateTestimonial(editing.id, form);
        setItems((prev) => prev.map((t) => (t.id === editing.id ? updated : t)));
        setDrawerOpen(false);
        setEditing(null);
        setForm({ author: "", content: "" });
      } else {
        const created = await createTestimonial(form);
        setItems((prev) => [...prev, created]);
        setDrawerOpen(false);
        setEditing(null);
        setForm({ author: "", content: "" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save testimonial");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteTestimonial(confirmDelete.id);
      setItems((prev) => prev.filter((t) => t.id !== confirmDelete.id));
      setDeleteSuccess(`"${confirmDelete.author}" deleted.`);
      setTimeout(() => setDeleteSuccess(null), 3000);
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "author",
      header: "Author",
      render: (t: Record<string, unknown>) => {
        const d = t as unknown as TestimonialData;
        return (
          <span className="flex items-center gap-2">
            {d.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
            )}
            <span className="font-medium text-[var(--text-primary)]">{d.author}</span>
          </span>
        );
      },
      sortable: true,
    },
    { key: "content", header: "Content", render: (t: Record<string, unknown>) => (
      <span className="text-sm text-[var(--text-secondary)] line-clamp-1">{(t as unknown as TestimonialData).content}</span>
    )},
    {
      key: "rating",
      header: "Rating",
      render: (t: Record<string, unknown>) => {
        const d = t as unknown as TestimonialData;
        return (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: d.rating }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
            ))}
          </div>
        );
      },
    },
    {
      key: "featured",
      header: "Featured",
      render: (t: Record<string, unknown>) => (t as unknown as TestimonialData).featured ? <Badge variant="default">Featured</Badge> : null,
    },
    {
      key: "actions",
      header: "",
      render: (t: Record<string, unknown>) => {
        const d = t as unknown as TestimonialData;
        return (
          <div className="flex items-center gap-1">
            <button onClick={() => openEdit(d)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors" aria-label={`Edit ${d.author}`}>
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => setConfirmDelete(d)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400 transition-colors" aria-label={`Delete ${d.author}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <FeaturePage
      title="Testimonials"
      description="Manage customer testimonials."
      actions={
        <button onClick={openCreate} className="btn-primary text-xs">
          <Plus className="h-4 w-4" /> Add Testimonial
        </button>
      }
    >
      {deleteError && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-600" role="alert">
          {deleteError}
        </div>
      )}
      {deleteSuccess && (
        <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm text-green-700" role="status">
          {deleteSuccess}
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState
          title="No testimonials yet"
          description="Add your first testimonial to showcase social proof on your storefront."
          icon={PackageOpen}
          action={
            <button onClick={openCreate} className="btn-primary text-sm">
              <Plus className="h-4 w-4" /> Add Testimonial
            </button>
          }
        />
      ) : (
        <CrudTable
          columns={columns}
          data={items as unknown as Record<string, unknown>[]}
          keyExtractor={(t) => (t as unknown as TestimonialData).id}
          searchable
          searchKeys={["author", "content"]}
          emptyMessage="No testimonials yet."
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={`Delete ${confirmDelete.author}`}>
          <div className="absolute inset-0 bg-[rgba(24,24,27,0.20)] backdrop-blur-sm" onClick={() => !isDeleting && setConfirmDelete(null)} />
          <div className="relative admin-card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete &quot;{confirmDelete.author}&quot;?</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">This will permanently delete the testimonial. This cannot be undone.</p>
            {deleteError && <p className="mt-3 text-xs text-red-600" role="alert">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} disabled={isDeleting} className="btn-secondary text-sm disabled:opacity-50">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50" aria-label={`Confirm delete ${confirmDelete.author}`}>
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <EditDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit ${editing.author}` : "New Testimonial"}
        isSaving={saving}
      >
        <div className="space-y-4">
          <MediaField
            label="Avatar"
            value={{ url: form.avatarUrl ?? null }}
            folder="general"
            accept="image/*"
            entityType="testimonial"
            entityId={editing?.id}
            onChange={(v) => setForm((f) => ({ ...f, avatarUrl: v?.url ?? undefined }))}
          />
          <Input label="Author" value={form.author} onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} />
          <Input label="Role" value={form.role ?? ""} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
          <Textarea label="Content" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={4} />
          <Input label="Rating (1-5)" type="number" min={1} max={5} value={form.rating ?? 5} onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="featured" checked={form.featured ?? false} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} className="rounded border-[var(--border)] bg-[var(--surface-hover)]" />
            <label htmlFor="featured" className="text-sm text-[var(--text-secondary)]">Featured</label>
          </div>
          {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400" role="alert">{error}</p>}
          <button onClick={handleSave} disabled={!form.author || !form.content || saving} className="btn-primary w-full text-sm disabled:opacity-50">
            {saving ? "Saving..." : editing ? "Update" : "Create"}
          </button>
        </div>
      </EditDrawer>
    </FeaturePage>
  );
}
