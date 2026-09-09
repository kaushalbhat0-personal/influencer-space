"use client";

import { useState } from "react";
import { importCreatorViaAgency } from "@/actions/partner.actions";
import { importResume } from "@/actions/resume.actions";
import { useRouter } from "next/navigation";
import { getCreatorCommercePlans } from "@/config/commerce/plans";

const PLANS = getCreatorCommercePlans()
  .filter((p) => p.code !== "creator_enterprise")
  .map((p) => ({ code: p.code, name: p.name }));

type SourceType = "website" | "google_business" | "youtube" | "instagram" | "manual_ai" | "resume";

const SOURCE_OPTIONS: Array<{ value: SourceType; label: string; placeholder: string; helper: string }> = [
  { value: "website", label: "Business Website", placeholder: "https://yourdomain.com", helper: "We'll extract your title, description and branding from your site." },
  { value: "google_business", label: "Google Business Profile", placeholder: "https://maps.google.com/maps/place/...", helper: "Paste your Google Maps or Business Profile URL — we extract the business name and location." },
  { value: "youtube", label: "YouTube Channel", placeholder: "https://youtube.com/@yourchannel", helper: "Works with channel, video and @handle links." },
  { value: "instagram", label: "Instagram Profile", placeholder: "https://instagram.com/yourhandle", helper: "We import your public profile branding." },
  { value: "manual_ai", label: "Business Description (AI)", placeholder: "", helper: "Describe the business and we'll generate the site with AI — no URL needed." },
  { value: "resume", label: "Resume / CV", placeholder: "", helper: "PDF or TXT, 5 MB max. We'll extract experience and skills." },
];

export function CreatorImportClient({ agencyId }: { agencyId: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ creatorName: "", email: "", sourceUrl: "", planCode: "creator_grow" });
  const [sourceType, setSourceType] = useState<SourceType>("website");
  const [manualBio, setManualBio] = useState("");
  const [manualProfession, setManualProfession] = useState("");
  const [manualCategory, setManualCategory] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; inviteUrl?: string } | null>(null);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      let effectiveSourceUrl: string | undefined = form.sourceUrl.trim() || undefined;
      let effectiveSourcePlatform: string | undefined = undefined;

      if (sourceType === "manual_ai") {
        const parts = [manualProfession, manualCategory, manualLocation, manualBio].filter(Boolean);
        const combined = parts.join("\n").trim();
        if (!combined) {
          setResult({ ok: false, message: "Please describe the client's business." });
          setBusy(false);
          return;
        }
        effectiveSourceUrl = combined;
        effectiveSourcePlatform = "manual";
      } else if (sourceType === "resume") {
        if (!resumeFile) {
          setResult({ ok: false, message: "Please select a resume file." });
          setBusy(false);
          return;
        }
        const fd = new FormData();
        fd.set("file", resumeFile);
        const resumeRes = await importResume(fd);
        if (!resumeRes.success || !resumeRes.bio) {
          setResult({ ok: false, message: resumeRes.error ?? "Resume import failed" });
          setBusy(false);
          return;
        }
        effectiveSourceUrl = resumeRes.bio;
        effectiveSourcePlatform = "resume";
        if (!form.creatorName && resumeRes.creatorName) {
          // Optionally use inferred name, but keep user-provided name as primary
        }
      } else if (sourceType === "website") {
        effectiveSourcePlatform = "website";
      } else if (sourceType === "google_business") {
        effectiveSourcePlatform = "google_maps";
      } else if (sourceType === "youtube") {
        effectiveSourcePlatform = "youtube";
      } else if (sourceType === "instagram") {
        effectiveSourcePlatform = "instagram";
      }

      // Validate URL for url-based types
      if (["website", "google_business", "youtube", "instagram"].includes(sourceType) && effectiveSourceUrl) {
        try {
          const u = new URL(effectiveSourceUrl.startsWith("http") ? effectiveSourceUrl : `https://${effectiveSourceUrl}`);
          if (!["http:", "https:"].includes(u.protocol)) throw new Error("invalid");
        } catch {
          setResult({ ok: false, message: "Please enter a valid URL starting with https://" });
          setBusy(false);
          return;
        }
      }

      const res = await importCreatorViaAgency({
        creatorName: form.creatorName,
        email: form.email,
        sourceUrl: effectiveSourceUrl,
        sourcePlatform: effectiveSourcePlatform,
        planCode: form.planCode,
      });
      if (res.success && res.inviteToken) {
        const claimUrl = `/claim-invite?token=${res.inviteToken}&email=${encodeURIComponent(form.email)}`;
        setResult({ ok: true, message: "Client website provisioned and linked to your agency.", inviteUrl: claimUrl });
        router.refresh();
      } else {
        setResult({ ok: false, message: res.error ?? "Import failed" });
      }
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : "Import failed" });
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]";
  const labelCls = "mb-1 block text-xs text-[var(--text-secondary)]";
  const currentSource = SOURCE_OPTIONS.find((s) => s.value === sourceType)!;

  const needsUrlInput = ["website", "google_business", "youtube", "instagram"].includes(sourceType);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-card)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">New Client Website</h3>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Client Business Name</label>
            <input className={input} value={form.creatorName} onChange={(e) => setForm({ ...form, creatorName: e.target.value })} aria-label="Client business name" data-testid="ci-name" placeholder="e.g. Blue Tokai Coffee, Kaushal Design" />
          </div>
          <div>
            <label className={labelCls}>Client Contact Email</label>
            <input className={input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-label="Client email" data-testid="ci-email" placeholder="client@example.com" />
          </div>

          <div>
            <label className={labelCls}>Client Source</label>
            <select className={input} value={sourceType} onChange={(e) => setSourceType(e.target.value as SourceType)} aria-label="Client source type" data-testid="ci-source-type">
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">{currentSource.helper}</p>
          </div>

          {needsUrlInput && (
            <div>
              <label className={labelCls}>{currentSource.label} URL</label>
              <input className={input} value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} aria-label="Source URL" data-testid="ci-source" placeholder={currentSource.placeholder} />
            </div>
          )}

          {sourceType === "manual_ai" && (
            <div className="space-y-3 rounded-lg border border-white/5 bg-zinc-900/30 p-3">
              <div>
                <label className={labelCls}>Business Description</label>
                <textarea className={`${input} min-h-[96px] resize-y`} value={manualBio} onChange={(e) => setManualBio(e.target.value)} placeholder="I'm a fitness coach helping busy professionals lose weight through online coaching and nutrition plans. Based in Pune." aria-label="Business description" data-testid="ci-manual-bio" />
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">Describe services, cuisine, specialties — we infer niche, audience and theme. No YouTube/Instagram needed.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Profession (optional)</label>
                  <input className={input} value={manualProfession} onChange={(e) => setManualProfession(e.target.value)} placeholder="e.g. Fitness Coach, Photographer" data-testid="ci-manual-profession" />
                </div>
                <div>
                  <label className={labelCls}>Category (optional)</label>
                  <input className={input} value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} placeholder="e.g. Health & Fitness" data-testid="ci-manual-category" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Location (optional)</label>
                <input className={input} value={manualLocation} onChange={(e) => setManualLocation(e.target.value)} placeholder="e.g. Bangalore" data-testid="ci-manual-location" />
              </div>
            </div>
          )}

          {sourceType === "resume" && (
            <div className="space-y-2">
              <label className={labelCls}>Resume File (PDF or TXT)</label>
              <input type="file" accept=".pdf,.txt,text/plain,application/pdf" onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-[var(--text-secondary)] file:mr-3 file:rounded file:border-0 file:bg-[var(--brand-primary)] file:px-3 file:py-1.5 file:text-xs file:text-white hover:file:bg-[var(--primary-hover)]" data-testid="ci-resume" />
              <p className="text-[11px] text-[var(--text-muted)]">5 MB max, private to your client tenant. We extract experience, skills and projects.</p>
              {resumeFile && <p className="text-[11px] text-[var(--text-secondary)]">Selected: {resumeFile.name} ({Math.round(resumeFile.size / 1024)} KB)</p>}
            </div>
          )}

          <div>
            <label className={labelCls}>Client Plan</label>
            <select className={input} value={form.planCode} onChange={(e) => setForm({ ...form, planCode: e.target.value })} aria-label="Plan" data-testid="ci-plan">
              {PLANS.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">Client pays Pendallo directly. Agency-managed clients require Creator Grow or higher.</p>
          </div>
          <button onClick={submit} disabled={busy || !form.creatorName || !form.email} className="rounded-md bg-[var(--brand-primary)] px-4 py-2 text-sm text-white hover:bg-[var(--primary-hover)] disabled:opacity-50" data-testid="ci-submit">
            {busy ? "Provisioning…" : "Create Client Website"}
          </button>
        </div>

        {result && (
          <div className={`mt-4 rounded-[var(--radius-card)] p-3 text-xs ${result.ok ? "bg-[var(--color-success-surface)] text-[var(--color-success)]" : "bg-[var(--color-danger-surface)] text-[var(--color-danger)]"}`} data-testid="ci-result">
            <p>{result.message}</p>
            {result.inviteUrl && (
              <p className="mt-2">
                Invitation: <code className="text-[var(--color-success)]" data-testid="ci-invite-url">{result.inviteUrl}</code>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-card)] p-5 text-xs text-[var(--text-muted)] space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">How it works</h3>
        <ol className="list-decimal space-y-1 pl-4">
          <li>Give Pendallo information about the client — website, Google Business profile, social link, description or resume.</li>
          <li>We intelligently analyze the profile and build the website (blueprint → composition → builder).</li>
          <li>We set up the workspace, website and publishing for you.</li>
          <li>The client is linked to your agency.</li>
          <li>A secure invitation is sent — the client sets their own password.</li>
          <li>The client becomes the owner of their workspace; you remain the manager.</li>
        </ol>
        <p className="text-[var(--text-muted)]">No passwords are generated or shared by the agency. Integrations are optional — core generation works without YouTube/Instagram credentials.</p>
        <div className="rounded-lg bg-zinc-900/40 p-3">
          <p className="font-medium text-[var(--text-secondary)] mb-1">Supported sources</p>
          <ul className="list-disc space-y-0.5 pl-4">
            <li>Business Website — branding & SEO from your domain</li>
            <li>Google Business Profile — name & location from Maps URL</li>
            <li>YouTube / Instagram — channel branding & audience</li>
            <li>Business Description — AI-generated from your text</li>
            <li>Resume / CV — professional experience for portfolio sites</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
