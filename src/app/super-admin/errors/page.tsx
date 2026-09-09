import { listSystemErrors, countByStatus } from "@/lib/observability/system-error-store";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ErrorsClient } from "./_components/errors-client";

export const dynamic = "force-dynamic";

export default async function ErrorsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") redirect("/admin/login");

  const [data, counts] = await Promise.all([
    listSystemErrors({ page: 1, pageSize: 50 }),
    countByStatus(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Errors</h1>
          <p className="mt-1 text-sm text-zinc-400">Durable application-error ledger — What/When/Where/Which tenant/Correlation/How many/Which commit/Is resolved.</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span data-testid="errors-new">{counts.NEW} new</span>
          <span data-testid="errors-acknowledged">{counts.ACKNOWLEDGED} acknowledged</span>
          <span data-testid="errors-resolved">{counts.RESOLVED} resolved</span>
          <span data-testid="errors-ignored">{counts.IGNORED} ignored</span>
        </div>
      </div>
      <ErrorsClient initial={data} />
    </div>
  );
}
