"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { CrudTable } from "@/features/_shared/components/crud-table";
import { EditDrawer } from "@/features/_shared/components/edit-drawer";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { EmptyState } from "@/components/ui/EmptyState";
import { PackageOpen } from "lucide-react";
import type { Column } from "@/features/_shared/components/crud-table";
import type { FAQItemData, FAQFormInput } from "@/features/faq/types";
import { createFAQItem, updateFAQItem, deleteFAQItem } from "@/features/faq/actions";

interface FAQManagerProps {
  initialData: FAQItemData[];
}

export function FAQManager({ initialData }: FAQManagerProps) {
  const [items, setItems] = useState<FAQItemData[]>(initialData);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<FAQItemData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FAQItemData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<FAQFormInput>({ question: "", answer: "" });

  const openCreate = () => {
    setEditing(null);
    setError(null);
    setForm({ question: "", answer: "" });
    setDrawerOpen(true);
  };

  const openEdit = (item: FAQItemData) => {
    setEditing(item);
    setError(null);
    setForm({ question: item.question, answer: item.answer, category: item.category ?? undefined });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const updated = await updateFAQItem(editing.id, form);
        setItems((prev) => prev.map((f) => (f.id === editing.id ? updated : f)));
      } else {
        const created = await createFAQItem(form);
        setItems((prev) => [...prev, created]);
      }
      setDrawerOpen(false);
      setEditing(null);
      setForm({ question: "", answer: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save FAQ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteFAQItem(confirmDelete.id);
      setItems((prev) => prev.filter((f) => f.id !== confirmDelete.id));
      setDeleteSuccess(`"${confirmDelete.question}" deleted.`);
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
      key: "question",
      header: "Question",
      render: (r: Record<string, unknown>) => <span className="font-medium text-[var(--text-primary)]">{(r as unknown as FAQItemData).question}</span>,
      sortable: true,
    },
    {
      key: "answer",
      header: "Answer",
      render: (r: Record<string, unknown>) => (
        <span className="text-sm text-[var(--text-secondary)] line-clamp-2">{(r as unknown as FAQItemData).answer}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (r: Record<string, unknown>) => <span className="text-xs text-[var(--text-muted)]">{(r as unknown as FAQItemData).category}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (r: Record<string, unknown>) => {
        const d = r as unknown as FAQItemData;
        return (
          <div className="flex items-center gap-2">
            <button onClick={() => openEdit(d)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors" aria-label={`Edit ${d.question}`}>
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => setConfirmDelete(d)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400 transition-colors" aria-label={`Delete ${d.question}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <FeaturePage
      title="FAQ"
      description="Manage frequently asked questions."
      actions={
        <button onClick={openCreate} className="btn-primary text-xs">
          <Plus className="h-4 w-4" /> Add Question
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
          title="No FAQs yet"
          description="Create your first FAQ to help your audience find answers quickly."
          icon={PackageOpen}
          action={
            <button onClick={openCreate} className="btn-primary text-sm">
              <Plus className="h-4 w-4" /> Add Question
            </button>
          }
        />
      ) : (
        <CrudTable
          columns={columns}
          data={items as unknown as Record<string, unknown>[]}
          keyExtractor={(r) => (r as unknown as FAQItemData).id}
          searchable
          searchKeys={["question", "answer"]}
          emptyMessage="No FAQs yet. Create your first question."
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={`Delete ${confirmDelete.question}`}>
          <div className="absolute inset-0 bg-[rgba(24,24,27,0.20)] backdrop-blur-sm" onClick={() => !isDeleting && setConfirmDelete(null)} />
          <div className="relative admin-card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete &quot;{confirmDelete.question}&quot;?</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">This will permanently delete the FAQ. This cannot be undone.</p>
            {deleteError && <p className="mt-3 text-xs text-red-600" role="alert">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} disabled={isDeleting} className="btn-secondary text-sm disabled:opacity-50">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50" aria-label={`Confirm delete ${confirmDelete.question}`}>
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <EditDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Question" : "New Question"}
        isSaving={saving}
      >
        <div className="space-y-4">
          <Input label="Question" value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} />
          <Textarea label="Answer" value={form.answer} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} rows={5} />
          <Input label="Category" value={form.category ?? ""} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Shipping" />
          {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400" role="alert">{error}</p>}
          <div className="flex gap-4">
            <button onClick={handleSave} disabled={saving || !form.question || !form.answer} className="btn-primary flex-1 text-sm">
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </button>
            <button onClick={() => setDrawerOpen(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      </EditDrawer>
    </FeaturePage>
  );
}
