"use client";

import { useState, useCallback } from "react";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { useAutosave } from "@/features/_shared/hooks/use-autosave";
import type { AccountSettingsData } from "../types";
import { updateProfile } from "../actions";

interface AccountSettingsProps {
  initialData: AccountSettingsData;
  tenantId: string;
}

/**
 * IMPLEMENTATION-18B — Account Settings only.
 * Creator identity (name, tagline, bio, profile picture, social links) is owned
 * by Hero and edited at /admin/settings. This page touches no storefront field.
 */
export function ProfilePage({ initialData }: AccountSettingsProps) {
  const [data, setData] = useState<AccountSettingsData>(initialData);
  const [dirty, setDirty] = useState(false);

  const save = useCallback(async (d: AccountSettingsData) => {
    await updateProfile(d);
    setDirty(false);
  }, []);

  useAutosave(data, save, dirty);

  const update = <K extends keyof AccountSettingsData>(key: K, value: AccountSettingsData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  return (
    <FeaturePage
      title="Account Settings"
      description="Account and business information. Your public identity (name, bio, profile picture) is managed in Hero."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="space-y-4 p-6">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Personal Information</h3>
          <Input
            label="Email"
            type="email"
            value={data.contactEmail ?? ""}
            onChange={(e) => update("contactEmail", e.target.value || null)}
          />
          <Input
            label="Phone"
            value={data.phone ?? ""}
            onChange={(e) => update("phone", e.target.value || null)}
          />
          <Input
            label="Timezone"
            value={data.timezone ?? ""}
            onChange={(e) => update("timezone", e.target.value || null)}
            placeholder="Asia/Kolkata"
          />
          <Input
            label="Language"
            value={data.language ?? ""}
            onChange={(e) => update("language", e.target.value || null)}
            placeholder="en-IN"
          />
          <Input
            label="Country"
            value={data.country ?? ""}
            onChange={(e) => update("country", e.target.value || null)}
          />
          <Input
            label="Location"
            value={data.location ?? ""}
            onChange={(e) => update("location", e.target.value || null)}
          />
        </GlassCard>

        <GlassCard className="space-y-4 p-6">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Business</h3>
          <Input
            label="Business Name"
            value={data.businessName ?? ""}
            onChange={(e) => update("businessName", e.target.value || null)}
          />
          <Input
            label="GST"
            value={data.gst ?? ""}
            onChange={(e) => update("gst", e.target.value || null)}
          />
          <Input
            label="Tax ID"
            value={data.taxId ?? ""}
            onChange={(e) => update("taxId", e.target.value || null)}
          />
          <Input
            label="Payout Preference"
            value={data.payoutPreference ?? ""}
            onChange={(e) => update("payoutPreference", e.target.value || null)}
            placeholder="UPI / Bank / Razorpay"
          />
          <Input
            label="Currency"
            value={data.currency ?? ""}
            onChange={(e) => update("currency", e.target.value || null)}
            placeholder="INR"
          />
        </GlassCard>

        <GlassCard className="space-y-4 p-6">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Preferences</h3>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-zinc-400">Email notifications</span>
            <input
              type="checkbox"
              checked={data.notifications.email}
              onChange={(e) => update("notifications", { ...data.notifications, email: e.target.checked })}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-s8ul-cyan focus:ring-s8ul-cyan/50"
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-zinc-400">Push notifications</span>
            <input
              type="checkbox"
              checked={data.notifications.push}
              onChange={(e) => update("notifications", { ...data.notifications, push: e.target.checked })}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-s8ul-cyan focus:ring-s8ul-cyan/50"
            />
          </label>
        </GlassCard>
      </div>
    </FeaturePage>
  );
}
