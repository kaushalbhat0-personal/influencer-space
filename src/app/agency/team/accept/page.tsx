"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { acceptAgencyTeamInvitation } from "@/actions/team.actions";
import { ContentContainer } from "@/components/layout";

type AcceptState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; message: string }
  | { status: "signin" }
  | { status: "error"; message: string };

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<AcceptState>({ status: "idle" });

  useEffect(() => {
    if (!token) {
      setState({ status: "error", message: "No invitation token provided" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    acceptAgencyTeamInvitation({ token }).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setState({ status: "ok", message: `You joined the agency team as ${res.role}.` });
      } else if (/signed in/i.test(res.error)) {
        // Safe pre-auth presentation — no sensitive agency information is
        // revealed before the invitee is authenticated and their email matches.
        setState({ status: "signin" });
      } else {
        setState({ status: "error", message: res.error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <ContentContainer>
      <div className="mx-auto mt-10 max-w-md rounded-xl border border-white/10 bg-zinc-900/50 p-6 text-center">
        <h1 className="mb-2 text-lg font-semibold text-white">Accept team invitation</h1>
        {state.status === "loading" && <p className="text-sm text-[var(--text-secondary)]">Accepting invitation…</p>}
        {state.status === "ok" && (
          <>
            <p className="mb-4 text-sm text-emerald-400">{state.message}</p>
            <Link href="/agency/team" className="rounded-md bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white">
              Go to team
            </Link>
          </>
        )}
        {state.status === "signin" && (
          <>
            <p className="mb-4 text-sm text-[var(--text-primary)]">You&apos;ve been invited to join a Partner workspace.</p>
            <p className="mb-4 text-sm text-[var(--text-secondary)]">Sign in with the invited email to continue.</p>
            <Link href="/admin/login" className="rounded-md bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white">
              Sign in
            </Link>
          </>
        )}
        {state.status === "error" && <p className="text-sm text-red-400">{state.message}</p>}
      </div>
    </ContentContainer>
  );
}
