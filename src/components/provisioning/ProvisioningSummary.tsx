"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, ExternalLink, User, Globe, LogIn, Key, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ProvisioningSummaryProps {
  data: {
    tenantId: string;
    tenantSlug: string;
    storefrontUrl: string;
    dashboardUrl: string;
    adminEmail: string;
    temporaryPassword: string;
  };
}

export function ProvisioningSummary({ data }: ProvisioningSummaryProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    const text = [
      `Storefront: ${data.storefrontUrl}`,
      `Dashboard: ${data.dashboardUrl}`,
      `Email: ${data.adminEmail}`,
      `Password: ${data.temporaryPassword}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyField = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-white">Provisioning Complete</h2>
        <p className="mt-1 text-sm text-zinc-400">
          All resources created successfully for <span className="font-medium text-zinc-200">{data.tenantSlug}</span>
        </p>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[var(--surface-base)] px-4 py-3">
          <div className="flex items-center gap-3">
            <FileCheck className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-xs text-zinc-500">Tenant</p>
              <p className="text-sm font-medium text-white">{data.tenantSlug}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[var(--surface-base)] px-4 py-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Globe className="h-4 w-4 shrink-0 text-indigo-400" />
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">Storefront URL</p>
              <p className="truncate text-sm font-medium text-indigo-400">{data.storefrontUrl}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-1 ml-3">
            <button
              onClick={() => handleCopyField(data.storefrontUrl)}
              className="rounded p-1.5 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors"
              title="Copy URL"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <a
              href={data.storefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded p-1.5 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors"
              title="Open website"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[var(--surface-base)] px-4 py-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <LogIn className="h-4 w-4 shrink-0 text-cyan-400" />
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">Dashboard URL</p>
              <p className="truncate text-sm font-medium text-cyan-400">{data.dashboardUrl}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-1 ml-3">
            <button
              onClick={() => handleCopyField(data.dashboardUrl)}
              className="rounded p-1.5 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors"
              title="Copy URL"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <a
              href={data.dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded p-1.5 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors"
              title="Open dashboard"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[var(--surface-base)] px-4 py-3">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="text-xs text-zinc-500">Admin Email</p>
              <p className="text-sm font-medium text-white">{data.adminEmail}</p>
            </div>
          </div>
          <button
            onClick={() => handleCopyField(data.adminEmail)}
            className="rounded p-1.5 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors"
            title="Copy email"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <Key className="h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="text-xs text-zinc-500">Temporary Password</p>
              <p className="font-mono text-sm font-bold text-amber-300">{data.temporaryPassword}</p>
            </div>
          </div>
          <button
            onClick={() => handleCopyField(data.temporaryPassword)}
            className="rounded p-1.5 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors"
            title="Copy password"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={handleCopyAll} className="flex-1 gap-2">
          <Copy className="h-4 w-4" />
          {copied ? "Copied!" : "Copy Credentials"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(data.dashboardUrl)}
          className="flex-1 gap-2"
        >
          <LogIn className="h-4 w-4" />
          Open Dashboard
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open(data.storefrontUrl, "_blank")}
          className="flex-1 gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Open Website
        </Button>
      </div>

      <p className="text-center text-xs text-zinc-600">
        Save the temporary password now. It will not be shown again.
      </p>
    </div>
  );
}
