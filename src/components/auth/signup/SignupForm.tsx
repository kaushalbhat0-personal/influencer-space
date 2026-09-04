"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";
import { getPlansByFamily, getSignupEligiblePlans } from "@/lib/capabilities";
import type { SignupState, Persona } from "./types";
import { STEP_ORDER } from "./types";
import { User, Building2, Sparkles, CheckCircle2, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const DEFAULT_STATE: SignupState = {
  step: "welcome",
  persona: null,
  selectedPlan: null,
  name: "",
  email: "",
  password: "",
  loading: false,
  error: null,
};

export function SignupForm({ pricing }: { pricing?: Record<string, { price: number | null; annualPrice?: number | null }> }) {
  const router = useRouter();
  const params = useSearchParams();
  const socialUrl = params.get("url") || "";
  const personaParam = (params.get("persona") || "") as string;
  const [state, setState] = useState<SignupState>(() => {
    const planParam = params.get("plan");
    // Map "partner" URL param to internal "agency" persona type
    const mappedPersona: Persona | null = personaParam === "partner" ? "agency" : personaParam === "creator" ? "creator" : null;
    const personaForPlan = mappedPersona ?? "creator";
    // RCCF-71.4.3: self-serve signup is FREE-only (RCCF-LAUNCH-01) — only plans
    // the registration lifecycle can actually provision (ctaType "signup") are
    // selectable. A paid plan code in the URL (e.g. ?plan=creator_grow) cannot
    // be granted at signup, so it falls back to no pre-selection.
    const initialPlan =
      planParam && getSignupEligiblePlans(personaForPlan === "agency" ? "agency" : "creator").some((p) => p.code === planParam)
        ? planParam
        : null;
    // Skip persona step if provided via URL, jump directly to plan selection.
    const initialStep = mappedPersona ? "plan" : (initialPlan || socialUrl ? "plan" : "welcome");
    return {
      ...DEFAULT_STATE,
      persona: mappedPersona,
      selectedPlan: initialPlan,
      step: initialStep,
    };
  });

  const update = useCallback((patch: Partial<SignupState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const next = useCallback(() => {
    setState((s) => {
      const idx = STEP_ORDER.indexOf(s.step);
      return { ...s, step: STEP_ORDER[idx + 1] ?? s.step, error: null };
    });
  }, []);

  const back = useCallback(() => {
    setState((s) => {
      const idx = STEP_ORDER.indexOf(s.step);
      return { ...s, step: STEP_ORDER[idx - 1] ?? s.step };
    });
  }, []);

  const selectPersona = useCallback((persona: Persona) => {
    const defaultPlan = persona === "creator" ? "creator_launch" : "partner_free";
    update({ persona, selectedPlan: state.selectedPlan || defaultPlan });
  }, [update, state.selectedPlan]);

  const handleSubmit = useCallback(async () => {
    update({ loading: true, error: null, step: "provisioning" });
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.email,
          password: state.password,
          name: state.name,
          persona: state.persona,
          planCode: state.selectedPlan,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        update({ loading: false, error: data.error || "Registration failed", step: "account" });
        return;
      }
      // Sign in
      await signIn("credentials", {
        email: state.email, password: state.password,
        redirect: false,
      });
      update({ step: "success", loading: false });
    } catch (e) {
      update({ loading: false, error: e instanceof Error ? e.message : "Registration failed", step: "account" });
    }
  }, [state.email, state.password, state.name, state.persona, state.selectedPlan, update]);

  const currentIdx = STEP_ORDER.indexOf(state.step) + 1;
  // RCCF-36: display the runtime (DB-authoritative) price when the server page
  // provides it, so Pricing Center == Marketing == Signup. The static registry
  // remains the structural source (ctaType/hidden/enterprise) and the fallback.
  const plansForPersona = getPlansByFamily(state.persona === "agency" ? "agency" : "creator").map((p) => ({
    ...p,
    price: pricing?.[p.code]?.price !== undefined ? pricing[p.code]!.price! : p.price,
  }));
  const selectedPlanDef = plansForPersona.find((p) => p.code === state.selectedPlan);
  const isEnterprise = selectedPlanDef?.ctaType === "contact";
  const isFreePlan = !isEnterprise && (selectedPlanDef?.price ?? 0) === 0;

  return (
    <div className="min-h-screen bg-[var(--surface-root)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Progress */}
        {state.step !== "welcome" && state.step !== "success" && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors",
                  i < currentIdx - 1 ? "bg-[var(--brand-primary)]" : "bg-white/[0.06]"
                )} />
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)]">Step {currentIdx - 1} of 4</p>
          </div>
        )}

        {/* Welcome */}
        {state.step === "welcome" && (
          <div className="text-center space-y-6">
            <div className="rounded-full bg-[var(--brand-primary)]/20 p-4 w-fit mx-auto">
              <Sparkles className="h-8 w-8 text-[var(--brand-primary)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Welcome to CreatorStore</h1>
              <p className="mt-2 text-[var(--text-secondary)]">Let&apos;s build your creator business.</p>
            </div>
            <button onClick={next} className="btn-primary w-full py-3">
              Continue
            </button>
          </div>
        )}

        {/* Persona */}
        {state.step === "persona" && (
          <div className="space-y-6">
            <div>
              <button onClick={back} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 mb-4">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <h2 className="text-xl font-semibold text-white">Who are you?</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">This helps us set up your workspace.</p>
            </div>
            <div className="grid gap-3">
              {([
                { id: "creator", icon: User, label: "Creator", desc: "YouTuber, coach, educator, photographer, freelancer" },
                { id: "agency", icon: Building2, label: "Agency", desc: "Marketing, social media, branding, creative studio" },
              ] as const).map((p) => (
                <button
                  key={p.id}
                  onClick={() => { selectPersona(p.id); next(); }}
                  className={cn(
                    "flex items-start gap-4 rounded-xl border p-5 text-left transition-all",
                    state.persona === p.id
                      ? "border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/[0.06]"
                      : "border-white/[0.08] bg-[var(--surface-base)]/50 hover:border-white/[0.15]"
                  )}
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-[var(--brand-primary)]/10 flex items-center justify-center">
                    <p.icon className="h-5 w-5 text-[var(--brand-primary)]" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{p.label}</p>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Plan Selection */}
        {state.step === "plan" && (
          <div className="space-y-6">
            <div>
              <button onClick={back} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 mb-4">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <h2 className="text-xl font-semibold text-white">Choose your plan</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {isFreePlan ? "Start free. Upgrade anytime." : "You selected a paid plan."}
              </p>
            </div>
            <div className="space-y-2">
              {(() => {
                // RCCF-71.4.3: signup is FREE-only — only plans the
                // registration lifecycle provisions (ctaType "signup") are
                // selectable. Paid plans are acquired via checkout afterwards.
                const plans = getSignupEligiblePlans(state.persona === "agency" ? "agency" : "creator");
                const sorted = [...plans].sort((a, b) => a.price - b.price);
                return sorted.map((plan) => (
                <button
                  key={plan.code}
                  data-plan={plan.code}
                  onClick={() => update({ selectedPlan: plan.code })}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl border p-4 text-left transition-all",
                    state.selectedPlan === plan.code
                      ? "border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/[0.06]"
                      : "border-white/[0.08] bg-[var(--surface-base)]/50"
                  )}
                >
                  <div>
                    <p className="font-medium text-white">{plan.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{plan.description}</p>
                  </div>
                  <span className={cn("text-sm font-semibold",
                    state.selectedPlan === plan.code ? "text-[var(--brand-primary)]" : "text-[var(--text-primary)]"
                  )}>
                    {plan.ctaType === "contact" ? "Contact Sales" : (plan.price === 0 ? "Free" : `${formatCurrency(plan.price)}/mo`)}
                  </span>
                </button>
              ));})()}
            </div>
            <button onClick={next} className="btn-primary w-full py-3">Continue</button>
          </div>
        )}

        {/* Account */}
        {state.step === "account" && (
          <div className="space-y-5">
            <div>
              <button onClick={back} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 mb-4">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <h2 className="text-xl font-semibold text-white">Create your account</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">You&apos;re joining as a {state.persona}. {isFreePlan ? "Free forever." : ""}</p>
            </div>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Name</label>
              <input id="name" type="text" value={state.name} onChange={(e) => update({ name: e.target.value })}
                className="admin-input" placeholder="Your name" autoComplete="name" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Email</label>
              <input id="email" type="email" value={state.email} onChange={(e) => update({ email: e.target.value })}
                className="admin-input" placeholder="you@example.com" autoComplete="email" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Password</label>
              <input id="password" type="password" value={state.password} onChange={(e) => update({ password: e.target.value })}
                className="admin-input" placeholder="Min 8 characters" autoComplete="new-password" />
            </div>
            {state.error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{state.error}</div>
            )}
            <button
              onClick={handleSubmit}
              disabled={!state.email || state.password.length < 8 || state.loading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {state.loading ? "Creating account..." : "Create Account"}
            </button>
          </div>
        )}

        {/* Provisioning */}
        {state.step === "provisioning" && (
          <div className="text-center space-y-5">
            <div className="animate-spin h-8 w-8 border-2 border-[var(--brand-primary)]/30 border-t-[var(--brand-primary)] rounded-full mx-auto" />
            <div>
              <h2 className="text-lg font-semibold text-white">Setting up your workspace</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">Creating account, provisioning billing, preparing dashboard...</p>
            </div>
          </div>
        )}

        {/* Success */}
        {state.step === "success" && (
          <div className="text-center space-y-6">
            <div className="rounded-full bg-emerald-500/20 p-4 w-fit mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {state.persona === "creator" ? "Let's build your website." : "Let's onboard your first creator."}
              </h2>
              {/* RCCF-MKT-11: the plan name is derived from the selected plan so a
                  Partner on Partner Launch is never told they are on "the Creator
                  Launch plan" (wrong-persona claim on the conversion journey). */}
              <p className="text-sm text-[var(--text-muted)] mt-2">
                Your account is ready. {!isEnterprise && selectedPlanDef && selectedPlanDef.price === 0 ? `You're on the ${selectedPlanDef.name} plan.` : ""}
              </p>
            </div>
            <button
              onClick={() => {
                const base = socialUrl
                  ? `/onboarding?url=${encodeURIComponent(socialUrl)}&persona=${state.persona}&plan=${state.selectedPlan}`
                  : state.persona === "agency"
                    ? "/agency/dashboard"
                    : "/onboarding";
                router.push(base);
              }}
              className="btn-primary w-full py-3"
            >
              {state.persona === "agency" ? "Go to Agency Workspace" : "Continue to Onboarding"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
