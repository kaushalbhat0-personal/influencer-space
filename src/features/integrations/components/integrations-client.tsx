"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Camera,
  BarChart3,
  Target,
  CheckCircle2,
  AlertTriangle,
  Settings2,
  Loader2,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { updateApiKeys, updateSocialChannels, clearIntegration } from "@/actions/settings.actions";
import type { IntegrationData, IntegrationStatus } from "../types";

const STATUS_META: Record<IntegrationStatus, { label: string; className: string; dot: string }> = {
  connected: { label: "Connected", className: "text-emerald-400", dot: "bg-emerald-500" },
  configured: { label: "Configured", className: "text-emerald-400", dot: "bg-emerald-500" },
  incomplete: { label: "Needs attention", className: "text-amber-400", dot: "bg-amber-500" },
  not_connected: { label: "Not connected", className: "text-zinc-400", dot: "bg-zinc-500" },
  coming_soon: { label: "Coming soon", className: "text-zinc-500", dot: "bg-zinc-600" },
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube: Play,
  instagram: Camera,
  ga: BarChart3,
  meta: Target,
};

type SaveState = { pending: boolean; message: string | null; ok: boolean | null };

function emptySave(): SaveState {
  return { pending: false, message: null, ok: null };
}

export function IntegrationsClient({
  integrations,
  tenantId,
}: {
  integrations: IntegrationData[];
  tenantId: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {integrations.map((int) => (
        <IntegrationCard key={int.platform} integration={int} tenantId={tenantId} />
      ))}
    </div>
  );
}

function IntegrationCard({
  integration,
  tenantId,
}: {
  integration: IntegrationData;
  tenantId: string;
}) {
  const meta = STATUS_META[integration.status];
  const Icon = ICONS[integration.icon] ?? CheckCircle2;

  if (integration.status === "coming_soon") {
    return (
      <GlassCard className="p-5">
        <CardHeader name={integration.name} description={integration.description} Icon={Icon} statusMeta={meta} />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5">
      <CardHeader name={integration.name} description={integration.description} Icon={Icon} statusMeta={meta} />
      <div className="mt-4">
        {integration.platform === "youtube" ? (
          <YoutubeControls integration={integration} tenantId={tenantId} />
        ) : (
          <InstagramControls integration={integration} tenantId={tenantId} />
        )}
      </div>
    </GlassCard>
  );
}

function CardHeader({
  name,
  description,
  Icon,
  statusMeta,
}: {
  name: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  statusMeta: { label: string; className: string; dot: string };
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Icon className="h-5 w-5 shrink-0 text-s8ul-cyan" />
          <h3 className="truncate font-semibold text-white">{name}</h3>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${statusMeta.className}`}>
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
          {statusMeta.label}
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-400">{description}</p>
    </div>
  );
}

function YoutubeControls({
  integration,
  tenantId,
}: {
  integration: IntegrationData;
  tenantId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(integration.status === "not_connected" || integration.status === "incomplete");
  const [apiKey, setApiKey] = useState("");
  const [channelId, setChannelId] = useState(typeof integration.config.channelId === "string" ? integration.config.channelId : "");
  const [save, setSave] = useState<SaveState>(emptySave);
  const [isPending, startTransition] = useTransition();

  const hasKey = !!integration.config.hasApiKey;
  const hasChannel = !!integration.config.hasChannel;

  async function handleSave() {
    setSave({ pending: true, message: null, ok: null });
    const result = await updateApiKeys(tenantId, { success: false }, youtubeKeyForm(apiKey));
    if (!result.success) {
      setSave({ pending: false, message: result.error ?? "Something went wrong. Please try again.", ok: false });
      return;
    }
    const channelResult = await updateSocialChannels(tenantId, { success: false }, channelForm(channelId));
    if (!channelResult.success) {
      setSave({ pending: false, message: channelResult.error ?? "Something went wrong. Please try again.", ok: false });
      return;
    }
    setSave({ pending: false, message: "YouTube settings saved.", ok: true });
    setApiKey("");
    setEditing(false);
    router.refresh();
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect YouTube? Your saved API key and channel will be removed.")) return;
    setSave({ pending: true, message: null, ok: null });
    const result = await clearIntegration(tenantId, "youtube");
    setSave({ pending: false, message: result.success ? "YouTube disconnected." : (result.error ?? "Failed to disconnect."), ok: result.success });
    if (result.success) {
      setApiKey("");
      setChannelId("");
      setEditing(true);
      router.refresh();
    }
  }

  if (integration.status === "connected" && !editing) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-400">
          {hasChannel && typeof integration.config.channelId === "string" && integration.config.channelId
            ? <>Channel <span className="font-mono text-zinc-300">{integration.config.channelId}</span></>
            : "Your YouTube channel is connected."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditing(true)} className="admin-btn-cyan px-4 py-2 text-xs">
            <Settings2 className="mr-1.5 inline h-3.5 w-3.5" />
            Manage
          </button>
          <button type="button" onClick={() => { void handleDisconnect(); }} disabled={save.pending} className="admin-btn-danger px-4 py-2 text-xs">
            {save.pending ? "Working..." : "Disconnect"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); startTransition(() => void handleSave()); }}
      className="space-y-4"
    >
      {integration.status === "incomplete" && (
        <p className="flex items-start gap-1.5 text-xs text-amber-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {hasKey ? "Add your YouTube Channel ID to finish connecting." : "Add your YouTube API key to finish connecting."}
        </p>
      )}

      <Input
        id="youtubeApiKey"
        name="youtubeApiKey"
        label="YouTube API Key"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={hasKey ? "API key configured — type to replace" : "Enter your YouTube API key"}
        autoComplete="off"
      />
      <Input
        id="youtubeChannelId"
        name="youtubeChannelId"
        label="YouTube Channel ID"
        value={channelId}
        onChange={(e) => setChannelId(e.target.value)}
        placeholder="e.g. UCxxxxxxxxxxxxxxxxxxxxxx"
        autoComplete="off"
      />
      <p className="text-xs text-zinc-500">Both pieces are required for YouTube stats and content syncing.</p>

      {save.message && (
        <p className={save.ok ? "text-sm text-emerald-400" : "text-sm text-red-400"} role="status">
          {save.message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={save.pending || isPending} className="admin-btn-cyan px-4 py-2 text-xs">
          {save.pending || isPending ? <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
          {save.pending || isPending ? "Saving..." : "Save"}
        </button>
        {integration.status === "connected" && (
          <button type="button" onClick={() => setEditing(false)} className="admin-btn-outline px-4 py-2 text-xs">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function InstagramControls({
  integration,
  tenantId,
}: {
  integration: IntegrationData;
  tenantId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(integration.status === "not_connected");
  const [apiKey, setApiKey] = useState("");
  const [save, setSave] = useState<SaveState>(emptySave);
  const [isPending, startTransition] = useTransition();

  const configured = !!integration.config.configured;

  async function handleSave() {
    setSave({ pending: true, message: null, ok: null });
    const result = await updateApiKeys(tenantId, { success: false }, instagramKeyForm(apiKey));
    if (!result.success) {
      setSave({ pending: false, message: result.error ?? "Something went wrong. Please try again.", ok: false });
      return;
    }
    setSave({ pending: false, message: "Instagram settings saved.", ok: true });
    setApiKey("");
    setEditing(false);
    router.refresh();
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Instagram? Your saved Instagram credential will be removed.")) return;
    setSave({ pending: true, message: null, ok: null });
    const result = await clearIntegration(tenantId, "instagram");
    setSave({ pending: false, message: result.success ? "Instagram disconnected." : (result.error ?? "Failed to disconnect."), ok: result.success });
    if (result.success) {
      setApiKey("");
      setEditing(true);
      router.refresh();
    }
  }

  if (configured && !editing) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-400">Instagram is configured and ready to sync content.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditing(true)} className="admin-btn-cyan px-4 py-2 text-xs">
            <Settings2 className="mr-1.5 inline h-3.5 w-3.5" />
            Manage
          </button>
          <button type="button" onClick={() => { void handleDisconnect(); }} disabled={save.pending} className="admin-btn-danger px-4 py-2 text-xs">
            {save.pending ? "Working..." : "Disconnect"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); startTransition(() => void handleSave()); }}
      className="space-y-4"
    >
      <Input
        id="instagramApiKey"
        name="instagramApiKey"
        label="Instagram Credential"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={configured ? "Credential configured — type to replace" : "Enter your Instagram credential"}
        autoComplete="off"
      />
      <p className="text-xs text-zinc-500">Used to keep your storefront content up to date.</p>

      {save.message && (
        <p className={save.ok ? "text-sm text-emerald-400" : "text-sm text-red-400"} role="status">
          {save.message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={save.pending || isPending} className="admin-btn-cyan px-4 py-2 text-xs">
          {save.pending || isPending ? <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
          {save.pending || isPending ? "Saving..." : "Save"}
        </button>
        {configured && (
          <button type="button" onClick={() => setEditing(false)} className="admin-btn-outline px-4 py-2 text-xs">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function youtubeKeyForm(apiKey: string): FormData {
  const formData = new FormData();
  if (apiKey) formData.set("youtubeApiKey", apiKey);
  return formData;
}

function instagramKeyForm(apiKey: string): FormData {
  const formData = new FormData();
  if (apiKey) formData.set("instagramApiKey", apiKey);
  return formData;
}

function channelForm(channelId: string): FormData {
  const formData = new FormData();
  if (channelId) formData.set("youtubeChannelId", channelId);
  return formData;
}
