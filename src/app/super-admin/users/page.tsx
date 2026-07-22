import { prisma } from "@/lib/prisma";
import { ContentContainer, PageHeader } from "@/components/layout";
import { UsersTable } from "./_components/users-table";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const raw = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, tenant: { select: { name: true } }, createdAt: true },
    orderBy: { createdAt: "desc" }, take: 200,
  });
  const users = raw.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, tenantName: u.tenant?.name ?? null, createdAt: u.createdAt.toISOString() }));

  const roleCounts = {
    super_admin: users.filter((u) => u.role === "SUPER_ADMIN").length,
    agency: users.filter((u) => u.role === "AGENCY_ADMIN" || u.role === "AGENCY_STAFF").length,
    creator: users.filter((u) => u.role === "ADMIN").length,
  };

  return (
    <ContentContainer>
      <PageHeader title="Users" description={`${users.length} platform users — ${roleCounts.super_admin} admins, ${roleCounts.agency} agency, ${roleCounts.creator} creators`} breadcrumbs={[{ label: "Dashboard", href: "/super-admin" }, { label: "Users" }]} />
      <UsersTable users={users} />
    </ContentContainer>
  );
}
