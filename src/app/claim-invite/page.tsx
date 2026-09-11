import { ClaimInviteClient } from "./_components/claim-invite-client";
import { BRAND } from "@/lib/marketing/messaging";
import { prisma } from "@/lib/prisma";
import { CREATOR_INVITE_SETTING } from "@/modules/partner/application/invitation";

export const dynamic = "force-dynamic";

async function getInviteState(token: string, email: string): Promise<{ valid: boolean; reason: string }> {
  if (!token || !email) return { valid: false, reason: "Invitation not found" };
  const settings = await prisma.setting.findMany({
    where: { key: CREATOR_INVITE_SETTING },
    select: { tenantId: true, value: true },
  });
  const setting = settings.find((s) => {
    const v = s.value as unknown as { token?: string; email?: string };
    return v?.token === token && (v?.email ?? "").toLowerCase() === email.toLowerCase();
  });
  if (!setting) return { valid: false, reason: "Invitation not found" };
  const invite = setting.value as unknown as { status?: string; expiresAt?: string; email?: string; token?: string };
  if (invite.status !== "pending") return { valid: false, reason: "Invitation already claimed" };
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) return { valid: false, reason: "Invitation expired" };
  return { valid: true, reason: "" };
}

export default async function ClaimInvitePage({ searchParams }: { searchParams: { token?: string; email?: string } }) {
  const token = searchParams.token ?? "";
  const email = searchParams.email ?? "";
  const state = await getInviteState(token, email);
  const isValid = state.valid;
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-root)] p-4">
      <div className="w-full max-w-md rounded-[var(--radius-card-elevated)] border border-[var(--border)] bg-[var(--surface-card)] p-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Creator Invitation</h1>
        {!isValid ? (
          <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--color-danger-border)] bg-[var(--color-danger-surface)] p-4" data-testid="claim-invalid">
            <p className="text-sm font-medium text-[var(--color-danger)]">{state.reason}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">This link is no longer valid. Ask your agency for a new invitation or sign in if you already have an account.</p>
            <a href="/admin/login" className="mt-3 inline-flex rounded-md bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90">Go to Sign In</a>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Set your password to activate your {BRAND.name} workspace.</p>
            <ClaimInviteClient token={token} email={email} />
          </>
        )}
      </div>
    </div>
  );
}
