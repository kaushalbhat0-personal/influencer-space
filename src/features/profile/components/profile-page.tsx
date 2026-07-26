"use client";

import { useState, useCallback } from "react";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { useAutosave } from "@/features/_shared/hooks/use-autosave";
import type { ProfileData, SocialLink } from "../types";
import { updateProfile } from "../actions";

interface ProfilePageProps {
  initialData: ProfileData;
}

export function ProfilePage({ initialData }: ProfilePageProps) {
  const [data, setData] = useState<ProfileData>(initialData);
  const [dirty, setDirty] = useState(false);

  const save = useCallback(async (d: ProfileData) => {
    await updateProfile(d);
    setDirty(false);
  }, []);

  useAutosave(data, save, dirty);

  const update = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const addSocialLink = () => {
    const links: SocialLink[] = [...(data.socialLinks ?? []), { platform: "", url: "" }];
    update("socialLinks", links);
  };

  const updateSocialLink = (index: number, field: keyof SocialLink, value: string) => {
    const links = [...(data.socialLinks ?? [])];
    links[index] = { ...links[index], [field]: value };
    update("socialLinks", links);
  };

  const removeSocialLink = (index: number) => {
    const links = [...(data.socialLinks ?? [])];
    links.splice(index, 1);
    update("socialLinks", links);
  };

  return (
    <FeaturePage title="Profile" description="Manage your public creator profile.">
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="space-y-4 p-6">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Personal Information</h3>
          <Input
            label="Name"
            value={data.name}
            onChange={(e) => update("name", e.target.value)}
          />
          <Input
            label="Tagline"
            value={data.tagline}
            onChange={(e) => update("tagline", e.target.value)}
          />
          <Textarea
            label="Bio"
            value={data.bio}
            onChange={(e) => update("bio", e.target.value)}
            rows={4}
          />
          <Input
            label="Location"
            value={data.location ?? ""}
            onChange={(e) => update("location", e.target.value || null)}
          />
        </GlassCard>

        <GlassCard className="space-y-4 p-6">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Brand</h3>
          <Input
            label="Primary Color"
            value={data.brandColors.primary}
            onChange={(e) => update("brandColors", { ...data.brandColors, primary: e.target.value })}
          />
          <Input
            label="Secondary Color"
            value={data.brandColors.secondary}
            onChange={(e) => update("brandColors", { ...data.brandColors, secondary: e.target.value })}
          />
          <Input
            label="Accent Color"
            value={data.brandColors.accent}
            onChange={(e) => update("brandColors", { ...data.brandColors, accent: e.target.value })}
          />
          <Input
            label="Contact Email"
            type="email"
            value={data.contactEmail ?? ""}
            onChange={(e) => update("contactEmail", e.target.value || null)}
          />
        </GlassCard>

        <GlassCard className="space-y-4 p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Social Links</h3>
            <Button variant="outline" size="sm" onClick={addSocialLink}>
              Add Link
            </Button>
          </div>
          {data.socialLinks?.map((link, i) => (
            <div key={i} className="flex items-center gap-3">
              <Input
                placeholder="Platform"
                value={link.platform}
                onChange={(e) => updateSocialLink(i, "platform", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="URL"
                value={link.url}
                onChange={(e) => updateSocialLink(i, "url", e.target.value)}
                className="flex-[2]"
              />
              <button
                onClick={() => removeSocialLink(i)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                aria-label={`Remove ${link.platform || "link"}`}
              >
                &times;
              </button>
            </div>
          ))}
          {(!data.socialLinks || data.socialLinks.length === 0) && (
            <p className="text-sm text-zinc-500">No social links added yet.</p>
          )}
        </GlassCard>
      </div>
    </FeaturePage>
  );
}
