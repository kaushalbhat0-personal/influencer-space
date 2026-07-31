"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { CrudTable } from "@/features/_shared/components/crud-table";
import { EditDrawer } from "@/features/_shared/components/edit-drawer";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { MediaField } from "@/components/shared/MediaField";
import type { Column } from "@/features/_shared/components/crud-table";
import type { CourseData, CourseFormInput } from "@/features/courses/types";
import { createCourse, updateCourse, deleteCourse } from "@/features/courses/actions";

interface CoursesManagerProps {
  initialData: CourseData[];
}

export function CoursesManager({ initialData }: CoursesManagerProps) {
  const [items, setItems] = useState<CourseData[]>(initialData);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CourseData | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CourseFormInput>({ title: "", price: 0, status: "PUBLISHED" });

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", price: 0, status: "PUBLISHED" });
    setDrawerOpen(true);
  };

  const openEdit = (item: CourseData) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description ?? undefined,
      price: item.price,
      imageUrl: item.imageUrl ?? undefined,
      category: item.category ?? undefined,
      status: item.status,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateCourse(editing.id, form);
        setItems((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
      } else {
        const created = await createCourse(form);
        setItems((prev) => [created, ...prev]);
      }
      setDrawerOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteCourse(id);
    setItems((prev) => prev.filter((c) => c.id !== id));
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
        const d = r as unknown as CourseData;
        return <Badge variant={d.status === "PUBLISHED" ? "default" : "warning"}>{d.status}</Badge>;
      },
    },
    {
      key: "price",
      header: "Price",
      render: (r: Record<string, unknown>) => `₹${(r as unknown as CourseData).price.toLocaleString("en-IN")}`,
      sortable: true,
    },
    {
      key: "category",
      header: "Category",
      render: (r: Record<string, unknown>) => {
        const d = r as unknown as CourseData;
        return <span className="text-xs text-zinc-500">{d.category ?? "—"}</span>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (r: Record<string, unknown>) => {
        const d = r as unknown as CourseData;
        return (
          <div className="flex items-center gap-2">
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
      title="Courses"
      description="Manage your course offerings."
      actions={
        <button onClick={openCreate} className="btn-primary text-xs">
          <Plus className="h-4 w-4" /> Add Course
        </button>
      }
    >
      <CrudTable
        columns={columns}
        data={items as unknown as Record<string, unknown>[]}
        keyExtractor={(r) => (r as unknown as CourseData).id}
        searchable
        searchKeys={["title"]}
        emptyMessage="No courses yet. Create your first course."
      />

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
            <Input label="Price (₹)" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
            <Input label="Category" value={form.category ?? ""} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Gaming" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-400">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CourseFormInput["status"] }))}
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
