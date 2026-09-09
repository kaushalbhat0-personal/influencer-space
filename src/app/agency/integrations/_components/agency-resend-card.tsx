"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, CheckCircle2, AlertTriangle, Settings2, Loader2, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import {
  saveAgencyResendIntegration,
  verifyAgencyResendIntegration,
  disconnectAgencyResendIntegration,
} from "@/actions/agency-integration.actions";
import type { TenantResendView } from "@/modules/tenant-integration/resend";

type Props = {
  initial: TenantResendView | null;
  isAdmin: boolean;
};

type SaveState = { pending: boolean; message: string | null; ok: boolean | null };
function emptySave(): SaveState {
  return { pending: false, message: null, ok: null };
}

export function AgencyResendCard({ initial, isAdmin }: Props) {
  const router = useRouter();
  const [view, setView] = useState<TenantResendView | null>(initial);
  const [editing, setEditing] = useState(!initial || initial.status !== "verified");
  const [apiKey, setApiKey] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [save, setSave] = useState<SaveState>(emptySave);
  const [isPending, startTransition] = useTransition();

  const isVerified = view?.status === "verified" && view?.verificationStatus === "verified";
  const hasKey = !!view?.hasApiKey;

  async function handleSave() {
    if (!isAdmin) return;
    setSave({ pending: true, message: null, ok: null });
    const res = await saveAgencyResendIntegration({ apiKey, emailFrom });
    if (!res.success) {
      setSave({ pending: false, message: res.error ?? "Failed to save", ok: false });
      return;
    }
    setSave({ pending: false, message: "Resend credentials saved. Verify your domain to enable sending.", ok: true });
    setApiKey("");
    router.refresh();
    setEditing(true);
  }

  async function handleVerify() {
    if (!isAdmin) return;
    setSave({ pending: true, message: null, ok: null });
    const res = await verifyAgencyResendIntegration();
    setSave({ pending: false, message: res.success ? "Domain verified — agency Resend is active." : (res.error ?? "Verification failed"), ok: res.success });
    if (res.success) {
      router.refresh();
      setEditing(false);
    }
  }

  async function handleDisconnect() {
    if (!isAdmin) return;
    if (!confirm("Disconnect Resend? Your API key and sender will be removed.")) return;
    setSave({ pending: true, message: null, ok: null });
    const res = await disconnectAgencyResendIntegration();
    setSave({ pending: false, message: res.success ? "Resend disconnected." : (res.error ?? "Failed to disconnect"), ok: res.success });
    if (res.success) {
      setView(null);
      setEditing(true);
      router.refresh();
    }
  }

  const statusMeta = isVerified
    ? { label: "Verified", className: "text-emerald-400", dot: "bg-emerald-500" }
    : hasKey
      ? { label: view?.status === "failed" ? "Verification failed" : "Pending verification", className: "text-amber-400", dot: "bg-amber-500" }
      : { label: "Not connected", className: "text-zinc-400", dot: "bg-zinc-500" };

  return (
    <GlassCard className="p-5 sm:col-span-2 lg:col-span-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Mail className="h-5 w-5 shrink-0 text-s8ul-cyan" />
          <h3 className="truncate font-semibold text-white">Resend — Agency Transactional Email</h3>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${statusMeta.className}`}>
          <span aria-hidden className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
          {statusMeta.label}
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-400">
        Connect your own Resend account to send client invitations and team invites from your domain. Uses your Resend
        quota — not Pendallo&apos;s. Without Resend, invitation links can be shared manually.
      </p>

      {isVerified && !editing ? (
        <div className="mt-4 space-y-3">
          <p className="flex items-center gap-2 text-sm text-zinc-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Sender: <span className="font-mono text-zinc-200">{view?.emailFrom}</span> — domain <span className="font-mono">{view?.domain}</span> verified
            {view?.maskedApiKey ? <span className="font-mono text-zinc-500">({view.maskedApiKey})</span> : null}
          </p>
          <p className="text-xs text-zinc-500">
            Client and team invitations are now sent via your Resend account. Pendallo&apos;s global email is never used for these.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setEditing(true)} disabled={!isAdmin} className="admin-btn-cyan px-4 py-2 text-xs disabled:opacity-50">
              <Settings2 className="mr-1.5 inline h-3.5 w-3.5" />
              Manage
            </button>
            <button type="button" onClick={() => void handleVerify()} disabled={save.pending || !isAdmin} className="admin-btn-outline px-4 py-2 text-xs disabled:opacity-50">
              {save.pending ? "Verifying..." : "Re-verify"}
            </button>
            <button type="button" onClick={() => void handleDisconnect()} disabled={save.pending || !isAdmin} className="admin-btn-danger px-4 py-2 text-xs disabled:opacity-50">
              {save.pending ? "Working..." : "Disconnect"}
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(() => void handleSave());
          }}
          className="mt-4 space-y-4"
        >
          {hasKey && !isVerified && (
            <p className="flex items-start gap-1.5 text-xs text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {view?.status === "failed"
                ? "Verification failed — check your API key and that the domain is verified in resend.com/domains, then Re-verify."
                : "Credentials saved but not yet verified. Add the domain in Resend, verify DNS, then click Verify."}
            </p>
          )}
          {!isAdmin && (
            <p className="text-xs text-amber-400">Only agency admins can edit Resend credentials.</p>
          )}
          <Input
            id="resendApiKey"
            label="Resend API Key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasKey ? "Key configured — type to replace (re_...)" : "re_... from resend.com/api-keys"}
            autoComplete="off"
            disabled={!isAdmin}
          />
          <Input
            id="resendEmailFrom"
            label="Sender / From Address"
            value={emailFrom}
            onChange={(e) => setEmailFrom(e.target.value)}
            placeholder={view?.emailFrom ?? "Agency <noreply@yourdomain.com>"}
            autoComplete="off"
            disabled={!isAdmin}
          />
          <p className="text-xs text-zinc-500">
            Use a sender address on a domain you have verified in Resend. We validate that the domain is verified before
            enabling agency sending. Your key is encrypted and never logged.
          </p>
          {save.message && <p className={save.ok ? "text-sm text-emerald-400" : "text-sm text-red-400"} role="status">{save.message}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={save.pending || isPending || !isAdmin} className="admin-btn-cyan px-4 py-2 text-xs disabled:opacity-50">
              {save.pending || isPending ? <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" /> : null}
              {save.pending || isPending ? "Saving..." : "Save"}
            </button>
            {hasKey && (
              <button type="button" onClick={() => void handleVerify()} disabled={save.pending || !isAdmin} className="admin-btn-outline px-4 py-2 text-xs disabled:opacity-50">
                Verify
              </button>
            )}
            {hasKey && (
              <button type="button" onClick={() => void handleDisconnect()} disabled={save.pending || !isAdmin} className="admin-btn-danger px-4 py-2 text-xs disabled:opacity-50">
                Disconnect
              </button>
            )}
            {isVerified && (
              <button type="button" onClick={() => setEditing(false)} className="admin-btn-outline px-4 py-2 text-xs">
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </GlassCard>
  );
}
