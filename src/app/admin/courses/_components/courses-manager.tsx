"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import type { CourseData, CourseFormInput } from "@/features/courses/types";
import { createCourse, updateCourse, deleteCourse } from "@/features/courses/actions";
import { formatCurrency } from "@/lib/utils";

interface CoursesManagerProps {
  initialData: CourseData[];
}

export function CoursesManager({ initialData }: CoursesManagerProps) {
  const [items, setItems] = useState<CourseData[]>(initialData);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CourseData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CourseData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<CourseFormInput>({ title: "", price: 0, status: "PUBLISHED" });

  const openCreate = () => {
    setEditing(null);
    setError(null);
    setForm({ title: "", price: 0, status: "PUBLISHED" });
    setDrawerOpen(true);
  };

  const openEdit = (item: CourseData) => {
    setEditing(item);
    setError(null);
    setForm({
      title: item.title,
      description: item.description ?? undefined,
      price: item.price,
      imageUrl: item.imageUrl ?? undefined,
      category: item.category ?? undefined,
      featured: item.featured,
      status: item.status,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const updated = await updateCourse(editing.id, form);
        setItems((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
        setDrawerOpen(false);
      } else {
        const res = await createCourse(form);
        if (!res.success) {
          setError(res.error ?? "Failed to create course");
          return;
        }
        setItems((prev) => [res.data, ...prev]);
        setDrawerOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteCourse(confirmDelete.id);
      setItems((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      setDeleteSuccess(`"${confirmDelete.title}" deleted.`);
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
      key: "title",
      header: "Title",
      render: (r: Record<string, unknown>) => {
        const d = r as unknown as CourseData;
        return (
          <span className="flex items-center gap-2">
            {d.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
            )}
            <span className="font-medium text-[var(--text-primary)]">{d.title}</span>
          </span>
        );
      },
      sortable: true,
    },
    {
      key: "status",
      header: "Status",
      render: (r: Record<string, unknown>) => {
        const d = r as unknown as CourseData;
        return <Badge variant={d.status === "PUBLISHED" ? "default" : "warning"}>{d.status}</Badge>;
      },
    },
    {
      key: "price",
      header: "Price",
      render: (r: Record<string, unknown>) => formatCurrency((r as unknown as CourseData).price),
      sortable: true,
    },
    {
      key: "category",
      header: "Category",
      render: (r: Record<string, unknown>) => {
        const d = r as unknown as CourseData;
        return <span className="text-xs text-[var(--text-muted)]">{d.category ?? "—"}</span>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (r: Record<string, unknown>) => {
        const d = r as unknown as CourseData;
        return (
          <div className="flex items-center gap-2">
            <button onClick={() => openEdit(d)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors" aria-label={`Edit ${d.title}`}>
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => setConfirmDelete(d)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400 transition-colors" aria-label={`Delete ${d.title}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <FeaturePage
      title="Courses"
      description="Manage your course offerings."
      actions={
        <button onClick={openCreate} className="btn-primary text-xs">
          <Plus className="h-4 w-4" /> Add Course
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
          title="No courses yet"
          description="Create your first course to start teaching your audience."
          icon={PackageOpen}
          action={
            <button onClick={openCreate} className="btn-primary text-sm">
              <Plus className="h-4 w-4" /> Create Course
            </button>
          }
        />
      ) : (
        <CrudTable
          columns={columns}
          data={items as unknown as Record<string, unknown>[]}
          keyExtractor={(r) => (r as unknown as CourseData).id}
          searchable
          searchKeys={["title"]}
          emptyMessage="No courses yet. Create your first course."
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={`Delete ${confirmDelete.title}`}>
          <div className="absolute inset-0 bg-[var(--surface-overlay)]/20 backdrop-blur-sm" onClick={() => !isDeleting && setConfirmDelete(null)} />
          <div className="relative admin-card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete &quot;{confirmDelete.title}&quot;?</h3>
            <p className="platform-body mt-1.5">This will permanently delete the course. This cannot be undone.</p>
            {deleteError && <p className="mt-3 text-xs text-red-600" role="alert">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} disabled={isDeleting} className="btn-secondary text-sm disabled:opacity-50">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50" aria-label={`Confirm delete ${confirmDelete.title}`}>
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <EditDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit ${editing.title}` : "New Course"}
        isSaving={saving}
      >
        <div className="space-y-4">
          <MediaField
            label="Image"
            value={{ url: form.imageUrl ?? null }}
            folder="courses"
            accept="image/*"
            entityType="course"
            entityId={editing?.id}
            onChange={(v) => setForm((f) => ({ ...f, imageUrl: v?.url ?? undefined }))}
          />
          <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description" value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (₹)" type="number" inputMode="decimal" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
            <Input label="Category" value={form.category ?? ""} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Gaming" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.featured ?? false} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} className="rounded border-[var(--border)]" />
            <span className="text-sm text-[var(--text-secondary)]">Featured on storefront</span>
          </label>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CourseFormInput["status"] }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
            >
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <p className="text-xs text-[var(--text-muted)]">Slug is auto-generated from the title if left empty. Use lowercase letters, numbers, and hyphens only.</p>
          {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400" role="alert">{error}</p>}
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
