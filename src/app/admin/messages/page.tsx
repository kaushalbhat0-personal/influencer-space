import { ContactService } from "@/services/contact.service";
import { MessagesList } from "./_components/messages-list";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { getTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const tenant = await getTenantContext();
  if (!tenant) {
    return (
      <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-400">
        <p className="text-lg font-semibold">No tenant configured</p>
      </div>
    );
  }

  let messages: Awaited<ReturnType<typeof ContactService.findAll>> = [];
  let error: string | null = null;

  try {
    messages = await ContactService.findAll(tenant.id);
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

  return <ErrorBoundary><MessagesList messages={messages} /></ErrorBoundary>;
}
