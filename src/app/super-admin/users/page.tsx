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

  const roleCountsRaw = await prisma.user.groupBy({ by: ["role"], _count: true });
  const counts = new Map(roleCountsRaw.map((r) => [r.role, r._count]));
  const totalUsers = roleCountsRaw.reduce((sum, r) => sum + r._count, 0);
  const roleCounts = {
    super_admin: counts.get("SUPER_ADMIN") ?? 0,
    agency: (counts.get("AGENCY_ADMIN") ?? 0) + (counts.get("AGENCY_STAFF") ?? 0),
    creator: counts.get("ADMIN") ?? 0,
  };

  return (
    <ContentContainer>
      {/* VALIDATION-04: counts are global (groupBy), not derived from the 200-row window. */}
      <PageHeader title="Users" description={`${totalUsers} platform users — ${roleCounts.super_admin} admins, ${roleCounts.agency} agency, ${roleCounts.creator} creators (showing latest ${users.length})`} breadcrumbs={[{ label: "Dashboard", href: "/super-admin" }, { label: "Users" }]} />
      <UsersTable users={users} />
    </ContentContainer>
  );
}
