"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent } from "@/components/ui/Card";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { VideoUpload } from "@/components/ui/VideoUpload";
import { supabaseClient, BUCKET } from "@/lib/supabase";
import { extractSupabaseFilePath, deleteSupabaseFile } from "@/utils/storage";
import { updateInfluencerData, updateHeroData, updateApiKeys } from "@/actions/settings.actions";
import { SettingsLivePreview } from "./settings-live-preview";
import type { InfluencerDataType } from "@/config/influencer";
import type { HeroDataType } from "@/config/hero";
import type { SettingsActionState } from "@/actions/settings.actions";

async function uploadFile(file: File, tenantId: string, folder: string): Promise<string> {
  const ext = file.name.split(".").pop();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const path = `${tenantId}/${folder}/${timestamp}-${random}.${ext}`;

  const { data, error: uploadError } = await supabaseClient.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabaseClient.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

export function SettingsForm({
  config,
  heroData,
  role,
  youtubeApiKey: initialYoutubeKey,
  instagramApiKey: initialInstagramKey,
  tenantId,
}: {
  config: InfluencerDataType;
  heroData: HeroDataType;
  role: "SUPER_ADMIN" | "ADMIN";
  youtubeApiKey: string;
  instagramApiKey: string;
  tenantId: string;
}) {
  const router = useRouter();
  const profileFormRef = useRef<HTMLFormElement>(null);
  const heroFormRef = useRef<HTMLFormElement>(null);
  const apiKeysFormRef = useRef<HTMLFormElement>(null);
  const [profileState, setProfileState] = useState<SettingsActionState>({ success: false });
  const [heroState, setHeroState] = useState<SettingsActionState>({ success: false });
  const [apiKeysState, setApiKeysState] = useState<SettingsActionState>({ success: false });
  const [profilePending, setProfilePending] = useState(false);
  const [heroPending, setHeroPending] = useState(false);
  const [apiKeysPending, setApiKeysPending] = useState(false);
  const [profileImage, setProfileImage] = useState<string>(config.profileImage || "");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>(heroData.videoUrl || "");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterUrl, setPosterUrl] = useState<string>(heroData.posterUrl || "");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [desktopAlignment, setDesktopAlignment] = useState<"top" | "center" | "bottom">(
    heroData.desktopAlignment as "top" | "center" | "bottom" || "center"
  );
  const [mobileAlignment, setMobileAlignment] = useState<"top" | "center" | "bottom">(
    heroData.mobileAlignment as "top" | "center" | "bottom" || "center"
  );
  const [youtubeApiKey, setYoutubeApiKey] = useState(initialYoutubeKey);
  const [instagramApiKey, setInstagramApiKey] = useState(initialInstagramKey);

  const [liveName, setLiveName] = useState(config.name || "");
  const [liveTagline, setLiveTagline] = useState(config.tagline || "");
  const [liveBio, setLiveBio] = useState(config.bio || "");
  const [liveBadgeText, setLiveBadgeText] = useState(heroData.liveBadgeText || "");
  const [liveShowBadge, setLiveShowBadge] = useState(heroData.showLiveBadge || false);

  async function handleProfileSubmit(formData: FormData) {
    setProfilePending(true);
    setProfileState({ success: false });

    const originalProfileImage = config.profileImage || "";

    if (profileImageFile) {
      try {
        const url = await uploadFile(profileImageFile, tenantId, "profile");
        setProfileImage(url);
        formData.set("profileImage", url);
      } catch (err) {
        setProfileState({ success: false, error: err instanceof Error ? err.message : "Profile image upload failed" });
        setProfilePending(false);
        return;
      }
    } else if (profileImage) {
      formData.set("profileImage", profileImage);
    }

    const result = await updateInfluencerData(tenantId, profileState, formData);
    setProfileState(result);
    setProfilePending(false);

    if (result.success) {
      const finalUrl = (formData.get("profileImage") as string) || "";
      if (originalProfileImage && originalProfileImage !== finalUrl) {
        const oldPath = extractSupabaseFilePath(originalProfileImage);
        if (oldPath) await deleteSupabaseFile(oldPath);
      }
      router.refresh();
    }
  }

  async function handleHeroSubmit(formData: FormData) {
    setHeroPending(true);
    setHeroState({ success: false });

    const originalVideoUrl = heroData.videoUrl || "";
    const originalPosterUrl = heroData.posterUrl || "";

    if (videoFile) {
      try {
        const url = await uploadFile(videoFile, tenantId, "hero");
        setVideoUrl(url);
        formData.set("videoUrl", url);
      } catch (err) {
        setHeroState({ success: false, error: err instanceof Error ? err.message : "Video upload failed" });
        setHeroPending(false);
        return;
      }
    } else if (videoUrl) {
      formData.set("videoUrl", videoUrl);
    }

    if (posterFile) {
      try {
        const url = await uploadFile(posterFile, tenantId, "hero");
        setPosterUrl(url);
        formData.set("posterUrl", url);
      } catch (err) {
        setHeroState({ success: false, error: err instanceof Error ? err.message : "Poster upload failed" });
        setHeroPending(false);
        return;
      }
    } else if (posterUrl) {
      formData.set("posterUrl", posterUrl);
    }

    formData.set("desktopAlignment", desktopAlignment);
    formData.set("mobileAlignment", mobileAlignment);

    const result = await updateHeroData(tenantId, heroState, formData);
    setHeroState(result);
    setHeroPending(false);

    if (result.success) {
      const finalVideoUrl = (formData.get("videoUrl") as string) || "";
      if (originalVideoUrl && originalVideoUrl !== finalVideoUrl) {
        const oldPath = extractSupabaseFilePath(originalVideoUrl);
        if (oldPath) await deleteSupabaseFile(oldPath);
      }

      const finalPosterUrl = (formData.get("posterUrl") as string) || "";
      if (originalPosterUrl && originalPosterUrl !== finalPosterUrl) {
        const oldPath = extractSupabaseFilePath(originalPosterUrl);
        if (oldPath) await deleteSupabaseFile(oldPath);
      }

      router.refresh();
    }
  }

  async function handleApiKeysSubmit(formData: FormData) {
    formData.set("youtubeApiKey", youtubeApiKey);
    formData.set("instagramApiKey", instagramApiKey);
    setApiKeysPending(true);
    setApiKeysState({ success: false });
    const result = await updateApiKeys(tenantId, apiKeysState, formData);
    setApiKeysState(result);
    setApiKeysPending(false);
    if (result.success) router.refresh();
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8 items-start">
      <div className="space-y-8">
        {/* ─── Hero Settings ─── */}
        <Card>
          <CardContent>
            <form ref={heroFormRef} action={handleHeroSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Hero Section</h3>
                <p className="text-sm text-gray-500">
                  Control the hero video, title, subtitle, and call-to-action buttons on the landing page.
                </p>

                <VideoUpload
                  onChange={(file) => {
                    setVideoFile(file);
                    if (!file) setVideoUrl("");
                  }}
                  currentUrl={videoUrl || null}
                  label="Hero Video"
                />

                <ImageUpload
                  onChange={(file) => {
                    setPosterFile(file);
                    if (!file) setPosterUrl("");
                  }}
                  currentUrl={posterUrl || null}
                  label="Hero Poster Image"
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white">Focal Point Alignment</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">Desktop</label>
                    <div className="flex gap-1">
                      {(["top", "center", "bottom"] as const).map((a) => (
                        <button
                          key={`desktop-${a}`}
                          type="button"
                          onClick={() => setDesktopAlignment(a)}
                          className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-all ${
                            desktopAlignment === a
                              ? "bg-s8ul-cyan/20 text-s8ul-cyan ring-1 ring-s8ul-cyan/30"
                              : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">Mobile</label>
                    <div className="flex gap-1">
                      {(["top", "center", "bottom"] as const).map((a) => (
                        <button
                          key={`mobile-${a}`}
                          type="button"
                          onClick={() => setMobileAlignment(a)}
                          className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-all ${
                            mobileAlignment === a
                              ? "bg-s8ul-cyan/20 text-s8ul-cyan ring-1 ring-s8ul-cyan/30"
                              : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Input
                id="heroTitle"
                name="heroTitle"
                label="Title"
                defaultValue={heroData.title}
                placeholder="Raj 'Snax' Varma"
              />
              <Input
                id="heroSubtitle"
                name="heroSubtitle"
                label="Subtitle"
                defaultValue={heroData.subtitle}
                placeholder="S8UL Esports | BGMI Pro | Content Creator"
              />
              <Input
                id="heroTagline"
                name="heroTagline"
                label="Tagline"
                defaultValue={heroData.tagline}
                placeholder="Hyderabad ki energy — global level ka game."
              />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Call-to-Action Buttons</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    id="ctaText"
                    name="ctaText"
                    label="Primary Button Text"
                    defaultValue={heroData.ctaText}
                    placeholder="Subscribe"
                  />
                  <Input
                    id="ctaLink"
                    name="ctaLink"
                    label="Primary Button Link"
                    defaultValue={heroData.ctaLink}
                    placeholder="https://youtube.com/@..."
                  />
                  <Input
                    id="ctaSecondaryText"
                    name="ctaSecondaryText"
                    label="Secondary Button Text"
                    defaultValue={heroData.ctaSecondaryText}
                    placeholder="Follow on IG"
                  />
                  <Input
                    id="ctaSecondaryLink"
                    name="ctaSecondaryLink"
                    label="Secondary Button Link"
                    defaultValue={heroData.ctaSecondaryLink}
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Live Badge</h4>
                <Input
                  id="liveBadgeText"
                  name="liveBadgeText"
                  label="Live Badge Text"
                  defaultValue={heroData.liveBadgeText}
                  placeholder="Live on YouTube"
                  onChange={(e) => setLiveBadgeText(e.target.value)}
                />
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="showLiveBadge"
                    defaultChecked={heroData.showLiveBadge}
                    onChange={(e) => setLiveShowBadge(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-s8ul-cyan focus:ring-s8ul-cyan/50"
                  />
                  <span className="text-sm text-gray-300">Show Live Badge</span>
                </label>
              </div>

              {heroState.success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  Hero settings updated successfully!
                </div>
              )}
              {heroState.error && (
                <p className="text-sm text-red-400">{heroState.error}</p>
              )}

              <div className="pt-2">
                <button type="submit" disabled={heroPending} className="admin-btn-cyan">
                  {heroPending ? "Saving..." : "Save Hero Settings"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ─── Personal Information ─── */}
        <Card>
          <CardContent>
            <form ref={profileFormRef} action={handleProfileSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Personal Information</h3>
                <Input
                  id="name"
                  name="name"
                  label="Full Name"
                  defaultValue={config.name}
                  error={profileState.fieldErrors?.name?.[0]}
                  onChange={(e) => setLiveName(e.target.value)}
                  required
                />
                <Input
                  id="tagline"
                  name="tagline"
                  label="Tagline"
                  defaultValue={config.tagline}
                  error={profileState.fieldErrors?.tagline?.[0]}
                  onChange={(e) => setLiveTagline(e.target.value)}
                  required
                />
                <Textarea
                  id="bio"
                  name="bio"
                  label="Bio"
                  defaultValue={config.bio}
                  error={profileState.fieldErrors?.bio?.[0]}
                  onChange={(e) => setLiveBio(e.target.value)}
                  rows={5}
                  required
                />
                <ImageUpload
                  onChange={(file) => {
                    setProfileImageFile(file);
                    if (!file) setProfileImage("");
                  }}
                  currentUrl={profileImage || null}
                  label="Profile Image"
                />
              </div>

              {role === "SUPER_ADMIN" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Niche</h3>
                <div>
                  <label htmlFor="niche" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Background Theme
                  </label>
                  <select
                    id="niche"
                    name="niche"
                    defaultValue={config.niche || "gaming"}
                    className="admin-select"
                  >
                    <option value="gaming" className="bg-gray-900 text-white">Gaming</option>
                    <option value="fitness" className="bg-gray-900 text-white">Fitness</option>
                    <option value="fashion" className="bg-gray-900 text-white">Fashion</option>
                    <option value="travel" className="bg-gray-900 text-white">Travel</option>
                    <option value="tech" className="bg-gray-900 text-white">Tech</option>
                    <option value="food" className="bg-gray-900 text-white">Food</option>
                    <option value="lifestyle" className="bg-gray-900 text-white">Lifestyle</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Controls the floating background icons on the public site.
                  </p>
                </div>
              </div>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Social Media Links</h3>
                <p className="text-sm text-gray-500">
                  Leave empty to hide the icon from the public site.
                </p>
                <Input
                  id="instagram"
                  name="instagram"
                  label="Instagram URL"
                  defaultValue={config.social.instagram}
                  placeholder="https://instagram.com/username"
                />
                <Input
                  id="youtube"
                  name="youtube"
                  label="YouTube URL"
                  defaultValue={config.social.youtube}
                  placeholder="https://youtube.com/@username"
                />
                <Input
                  id="twitter"
                  name="twitter"
                  label="Twitter / X URL"
                  defaultValue={config.social.twitter}
                  placeholder="https://twitter.com/username"
                />
                <Input
                  id="tiktok"
                  name="tiktok"
                  label="TikTok URL"
                  defaultValue={config.social.tiktok}
                  placeholder="https://tiktok.com/@username"
                />
              </div>

              {profileState.success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  Profile updated successfully!
                </div>
              )}
              {profileState.error && (
                <p className="text-sm text-red-400">{profileState.error}</p>
              )}

              <div className="flex items-center gap-4 pt-2">
                <button type="submit" disabled={profilePending} className="admin-btn-cyan">
                  {profilePending ? "Saving..." : "Save Profile"}
                </button>
                <button type="button" onClick={() => router.push("/admin/dashboard")} className="admin-btn-outline">
                  Back to Dashboard
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ─── API Integrations ─── */}
        <Card>
          <CardContent>
            <form ref={apiKeysFormRef} action={handleApiKeysSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Developer / API Integrations</h3>
                <p className="text-sm text-gray-400">
                  Provide your own API keys to automatically display your latest videos and posts on your live website.
                  These are stored securely and never exposed to the client.
                </p>

                <Input
                  id="youtubeApiKey"
                  name="youtubeApiKey"
                  label="YouTube Data API Key"
                  type="password"
                  value={youtubeApiKey}
                  onChange={(e) => setYoutubeApiKey(e.target.value)}
                  placeholder="AIzaSyA-..."
                  autoComplete="off"
                />

                <Input
                  id="instagramApiKey"
                  name="instagramApiKey"
                  label="Instagram Graph API Token"
                  type="password"
                  value={instagramApiKey}
                  onChange={(e) => setInstagramApiKey(e.target.value)}
                  placeholder="EAAloQ..."
                  autoComplete="off"
                />
              </div>

              {apiKeysState.success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  API keys saved successfully!
                </div>
              )}
              {apiKeysState.error && (
                <p className="text-sm text-red-400">{apiKeysState.error}</p>
              )}

              <div className="pt-2">
                <button type="submit" disabled={apiKeysPending} className="admin-btn-cyan">
                  {apiKeysPending ? "Saving..." : "Save API Keys"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="sticky top-6 hidden xl:block">
        <div className="rounded-xl border border-white/5 bg-zinc-900/30 p-4">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Live Preview
          </p>
          <SettingsLivePreview
            heroUrl={posterUrl || videoUrl || heroData.posterUrl || heroData.videoUrl || ""}
            mobileAlignment={mobileAlignment}
            profileUrl={profileImage || config.profileImage || null}
            name={liveName}
            tagline={liveTagline}
            bio={liveBio}
            liveBadgeText={liveBadgeText}
            showLiveBadge={liveShowBadge}
          />
        </div>
      </div>
    </div>
  );
}
