import { prisma } from "@/lib/prisma";
import { ContentContainer, PageHeader } from "@/components/layout";
import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  tenantName: string | null;
  createdAt: Date;
}

const ROLE_VARIANT: Record<string, "cyan" | "success" | "warning" | "gold" | "default"> = {
  SUPER_ADMIN: "gold",
  AGENCY_ADMIN: "cyan",
  AGENCY_STAFF: "warning",
  ADMIN: "success",
};

const columns: Column<UserRow>[] = [
  {
    key: "name", header: "Name", sortable: true,
    cell: (r) => <span className="text-white text-sm">{r.name || "—"}</span>,
  },
  {
    key: "email", header: "Email", sortable: true,
    cell: (r) => <span className="text-zinc-300 text-sm">{r.email}</span>,
  },
  {
    key: "role", header: "Role", sortable: true,
    cell: (r) => <Badge variant={ROLE_VARIANT[r.role] ?? "default"} size="sm">{r.role}</Badge>,
  },
  {
    key: "tenantName", header: "Tenant", sortable: true,
    cell: (r) => <span className="text-zinc-400 text-sm">{r.tenantName || "—"}</span>,
  },
  {
    key: "createdAt", header: "Joined", sortable: true,
    cell: (r) => <span className="text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span>,
  },
];

export default async function UsersPage() {
  let users: UserRow[] = [];
  try {
    const raw = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true,
        tenant: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    users = raw.map((u) => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      tenantName: u.tenant?.name ?? null, createdAt: u.createdAt,
    }));
  } catch { /* fallback */ }

  const roleCounts = {
    super_admin: users.filter((u) => u.role === "SUPER_ADMIN").length,
    agency: users.filter((u) => u.role === "AGENCY_ADMIN" || u.role === "AGENCY_STAFF").length,
    creator: users.filter((u) => u.role === "ADMIN").length,
  };

  return (
    <ContentContainer>
      <PageHeader
        title="Users"
        description={`${users.length} platform users — ${roleCounts.super_admin} admins, ${roleCounts.agency} agency, ${roleCounts.creator} creators`}
        breadcrumbs={[{ label: "Dashboard", href: "/super-admin" }, { label: "Users" }]}
      />

      <DataTable
        columns={columns}
        data={users}
        pageSize={25}
        searchable
        searchPlaceholder="Search by name, email, or role..."
        emptyMessage="No users found."
      />
    </ContentContainer>
  );
}
