"use client";

import { DataTable } from "@/components/data/DataTable";
import { Badge } from "@/components/ui/Badge";
import type { Column } from "@/components/data/DataTable";

interface UserRow { id: string; name: string | null; email: string; role: string; tenantName: string | null; createdAt: string; }

const ROLE_VARIANT: Record<string, "cyan" | "success" | "warning" | "gold" | "default"> = {
  SUPER_ADMIN: "gold", AGENCY_ADMIN: "cyan", AGENCY_STAFF: "warning", ADMIN: "success",
};

const columns: Column<UserRow>[] = [
  { key: "name", header: "Name", sortable: true, cell: (r) => <span className="text-white text-sm">{r.name || "—"}</span> },
  { key: "email", header: "Email", sortable: true, cell: (r) => <span className="text-zinc-300 text-sm">{r.email}</span> },
  { key: "role", header: "Role", sortable: true, cell: (r) => <Badge variant={ROLE_VARIANT[r.role] ?? "default"} size="sm">{r.role}</Badge> },
  { key: "tenantName", header: "Tenant", sortable: true, cell: (r) => <span className="text-zinc-400 text-sm">{r.tenantName || "—"}</span> },
  { key: "createdAt", header: "Joined", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span> },
];

export function UsersTable({ users }: { users: UserRow[] }) {
  return <DataTable columns={columns} data={users} pageSize={25} searchable searchPlaceholder="Search by name, email, or role..." emptyMessage="No users found." />;
}
