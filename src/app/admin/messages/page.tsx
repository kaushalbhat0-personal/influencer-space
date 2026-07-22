import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MessagesList } from "./_components/messages-list";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) {
    return (
      <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-400">
        <p className="text-lg font-semibold">No tenant configured</p>
      </div>
    );
  }

  let messages: Awaited<ReturnType<typeof prisma.contactSubmission.findMany>> = [];
  let error: string | null = null;

  try {
    messages = await prisma.contactSubmission.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load messages";
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-400">
        <p className="text-lg font-semibold">Failed to load messages</p>
        <p className="mt-1 text-sm text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <MessagesList
        messages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      />
    </ErrorBoundary>
  );
}
