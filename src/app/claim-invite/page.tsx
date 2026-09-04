import { ClaimInviteClient } from "./_components/claim-invite-client";

export const dynamic = "force-dynamic";

export default async function ClaimInvitePage({ searchParams }: { searchParams: { token?: string; email?: string } }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-root)] p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-6">
        <h1 className="text-xl font-bold text-white">Creator Invitation</h1>
        <p className="mt-1 text-sm text-zinc-400">Set your password to activate your CreatorStore workspace.</p>
        <ClaimInviteClient token={searchParams.token ?? ""} email={searchParams.email ?? ""} />
      </div>
    </div>
  );
}
