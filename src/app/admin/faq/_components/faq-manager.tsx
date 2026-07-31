"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { CrudTable } from "@/features/_shared/components/crud-table";
import { EditDrawer } from "@/features/_shared/components/edit-drawer";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
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
  const [form, setForm] = useState<FAQFormInput>({ question: "", answer: "" });

  const openCreate = () => {
    setEditing(null);
    setForm({ question: "", answer: "" });
    setDrawerOpen(true);
  };

  const openEdit = (item: FAQItemData) => {
    setEditing(item);
    setForm({ question: item.question, answer: item.answer, category: item.category ?? undefined });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteFAQItem(id);
    setItems((prev) => prev.filter((f) => f.id !== id));
  };

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "question",
      header: "Question",
      render: (r: Record<string, unknown>) => <span className="font-medium text-zinc-200">{(r as unknown as FAQItemData).question}</span>,
      sortable: true,
    },
    {
      key: "answer",
      header: "Answer",
      render: (r: Record<string, unknown>) => (
        <span className="text-sm text-zinc-400 line-clamp-2">{(r as unknown as FAQItemData).answer}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (r: Record<string, unknown>) => <span className="text-xs text-zinc-500">{(r as unknown as FAQItemData).category}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (r: Record<string, unknown>) => {
        const d = r as unknown as FAQItemData;
        return (
          <div className="flex items-center gap-2">
            <button onClick={() => openEdit(d)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200" aria-label={`Edit ${d.question}`}>
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => handleDelete(d.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400" aria-label={`Delete ${d.question}`}>
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
      <CrudTable
        columns={columns}
        data={items as unknown as Record<string, unknown>[]}
        keyExtractor={(r) => (r as unknown as FAQItemData).id}
        searchable
        searchKeys={["question", "answer"]}
        emptyMessage="No FAQ items yet. Create your first question."
      />

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
