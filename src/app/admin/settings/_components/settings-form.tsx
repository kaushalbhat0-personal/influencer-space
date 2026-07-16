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

type SaveState = { pending: boolean; state: SettingsActionState };

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

function emptyState(): SaveState {
  return { pending: false, state: { success: false } };
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
  const heroDetailFormRef = useRef<HTMLFormElement>(null);
  const profileInfoFormRef = useRef<HTMLFormElement>(null);
  const apiKeysFormRef = useRef<HTMLFormElement>(null);

  const [videoSave, setVideoSave] = useState<SaveState>(emptyState);
  const [posterSave, setPosterSave] = useState<SaveState>(emptyState);
  const [heroDetailsSave, setHeroDetailsSave] = useState<SaveState>(emptyState);
  const [profilePicSave, setProfilePicSave] = useState<SaveState>(emptyState);
  const [profileInfoSave, setProfileInfoSave] = useState<SaveState>(emptyState);
  const [apiKeysSave, setApiKeysSave] = useState<SaveState>(emptyState);

  const [profileImage, setProfileImage] = useState<string>(config.profileImage || "");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>(heroData.videoUrl || "");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterUrl, setPosterUrl] = useState<string>(heroData.posterUrl || "");
  const [posterFile, setPosterFile] = useState<File | null>(null);

  const [videoDesktopAlignment, setVideoDesktopAlignment] = useState<"top" | "center" | "bottom">(
    heroData.videoDesktopAlignment as "top" | "center" | "bottom" || "center"
  );
  const [videoMobileAlignment, setVideoMobileAlignment] = useState<"top" | "center" | "bottom">(
    heroData.videoMobileAlignment as "top" | "center" | "bottom" || "center"
  );
  const [imageDesktopAlignment, setImageDesktopAlignment] = useState<"top" | "center" | "bottom">(
    heroData.imageDesktopAlignment as "top" | "center" | "bottom" || "center"
  );
  const [imageMobileAlignment, setImageMobileAlignment] = useState<"top" | "center" | "bottom">(
    heroData.imageMobileAlignment as "top" | "center" | "bottom" || "center"
  );

  const [youtubeApiKey, setYoutubeApiKey] = useState(initialYoutubeKey);
  const [instagramApiKey, setInstagramApiKey] = useState(initialInstagramKey);

  const [liveName, setLiveName] = useState(config.name || "");
  const [liveTagline, setLiveTagline] = useState(config.tagline || "");
  const [liveBio, setLiveBio] = useState(config.bio || "");
  const [liveBadgeText, setLiveBadgeText] = useState(heroData.liveBadgeText || "");
  const [liveShowBadge, setLiveShowBadge] = useState(heroData.showLiveBadge || false);

  function alignmentButtons(
    desktopAlign: string,
    mobileAlign: string,
    onDesktop: (a: "top" | "center" | "bottom") => void,
    onMobile: (a: "top" | "center" | "bottom") => void,
  ) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Desktop</label>
          <div className="flex gap-1">
            {(["top", "center", "bottom"] as const).map((a) => (
              <button
                key={`d-${a}`}
                type="button"
                onClick={() => onDesktop(a)}
                className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-all ${
                  desktopAlign === a
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
                key={`m-${a}`}
                type="button"
                onClick={() => onMobile(a)}
                className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-all ${
                  mobileAlign === a
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
    );
  }

  async function handleSaveVideo() {
    setVideoSave({ pending: true, state: { success: false } });

    const formData = new FormData();
    const originalVideoUrl = heroData.videoUrl || "";

    if (videoFile) {
      try {
        const url = await uploadFile(videoFile, tenantId, "hero");
        setVideoUrl(url);
        formData.set("videoUrl", url);
      } catch (err) {
        setVideoSave({ pending: false, state: { success: false, error: err instanceof Error ? err.message : "Upload failed" } });
        return;
      }
    } else if (videoUrl) {
      formData.set("videoUrl", videoUrl);
    }

    formData.set("videoDesktopAlignment", videoDesktopAlignment);
    formData.set("videoMobileAlignment", videoMobileAlignment);

    const result = await updateHeroData(tenantId, { success: false }, formData);
    setVideoSave({ pending: false, state: result });

    if (result.success) {
      const finalVideoUrl = (formData.get("videoUrl") as string) || "";
      if (originalVideoUrl && originalVideoUrl !== finalVideoUrl) {
        const oldPath = extractSupabaseFilePath(originalVideoUrl);
        if (oldPath) await deleteSupabaseFile(oldPath);
      }
      router.refresh();
    }
  }

  async function handleSavePoster() {
    setPosterSave({ pending: true, state: { success: false } });

    const formData = new FormData();
    const originalPosterUrl = heroData.posterUrl || "";

    if (posterFile) {
      try {
        const url = await uploadFile(posterFile, tenantId, "hero");
        setPosterUrl(url);
        formData.set("posterUrl", url);
      } catch (err) {
        setPosterSave({ pending: false, state: { success: false, error: err instanceof Error ? err.message : "Upload failed" } });
        return;
      }
    } else if (posterUrl) {
      formData.set("posterUrl", posterUrl);
    }

    formData.set("imageDesktopAlignment", imageDesktopAlignment);
    formData.set("imageMobileAlignment", imageMobileAlignment);

    const result = await updateHeroData(tenantId, { success: false }, formData);
    setPosterSave({ pending: false, state: result });

    if (result.success) {
      const finalPosterUrl = (formData.get("posterUrl") as string) || "";
      if (originalPosterUrl && originalPosterUrl !== finalPosterUrl) {
        const oldPath = extractSupabaseFilePath(originalPosterUrl);
        if (oldPath) await deleteSupabaseFile(oldPath);
      }
      router.refresh();
    }
  }

  async function handleSaveHeroDetails(formData: FormData) {
    setHeroDetailsSave({ pending: true, state: { success: false } });

    if (!formData.has("showLiveBadge")) {
      formData.append("showLiveBadge", liveShowBadge ? "true" : "false");
    }

    const result = await updateHeroData(tenantId, { success: false }, formData);
    setHeroDetailsSave({ pending: false, state: result });
    if (result.success) router.refresh();
  }

  async function handleSaveProfilePicture() {
    setProfilePicSave({ pending: true, state: { success: false } });

    const formData = new FormData();
    formData.set("name", config.name);
    formData.set("tagline", config.tagline);
    formData.set("bio", config.bio);
    formData.set("instagram", config.social.instagram);
    formData.set("youtube", config.social.youtube);
    formData.set("twitter", config.social.twitter);
    formData.set("tiktok", config.social.tiktok);

    const originalProfileImage = config.profileImage || "";

    if (profileImageFile) {
      try {
        const url = await uploadFile(profileImageFile, tenantId, "profile");
        setProfileImage(url);
        formData.set("profileImage", url);
      } catch (err) {
        setProfilePicSave({ pending: false, state: { success: false, error: err instanceof Error ? err.message : "Upload failed" } });
        return;
      }
    } else if (profileImage) {
      formData.set("profileImage", profileImage);
    }

    const result = await updateInfluencerData(tenantId, { success: false }, formData);
    setProfilePicSave({ pending: false, state: result });

    if (result.success) {
      const finalUrl = (formData.get("profileImage") as string) || "";
      if (originalProfileImage && originalProfileImage !== finalUrl) {
        const oldPath = extractSupabaseFilePath(originalProfileImage);
        if (oldPath) await deleteSupabaseFile(oldPath);
      }
      router.refresh();
    }
  }

  async function handleSaveProfileInfo(formData: FormData) {
    setProfileInfoSave({ pending: true, state: { success: false } });

    if (profileImage) formData.set("profileImage", profileImage);

    const result = await updateInfluencerData(tenantId, { success: false }, formData);
    setProfileInfoSave({ pending: false, state: result });
    if (result.success) router.refresh();
  }

  async function handleSaveApiKeys(formData: FormData) {
    formData.set("youtubeApiKey", youtubeApiKey);
    formData.set("instagramApiKey", instagramApiKey);
    setApiKeysSave({ pending: true, state: { success: false } });

    const result = await updateApiKeys(tenantId, { success: false }, formData);
    setApiKeysSave({ pending: false, state: result });
    if (result.success) router.refresh();
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8 items-start">
      <div className="space-y-8">
        {/* ─── Hero Video ─── */}
        <Card>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Hero Video</h3>
              <VideoUpload
                onChange={(file) => {
                  setVideoFile(file);
                  if (!file) setVideoUrl("");
                }}
                currentUrl={videoUrl || null}
                label="Hero Video"
              />
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Focal Point Alignment</h4>
                {alignmentButtons(videoDesktopAlignment, videoMobileAlignment, setVideoDesktopAlignment, setVideoMobileAlignment)}
              </div>
              {videoSave.state.success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  Video settings saved!
                </div>
              )}
              {videoSave.state.error && (
                <p className="text-sm text-red-400">{videoSave.state.error}</p>
              )}
              <button type="button" onClick={handleSaveVideo} disabled={videoSave.pending} className="admin-btn-cyan">
                {videoSave.pending ? "Saving..." : "Save Video"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ─── Hero Poster Image ─── */}
        <Card>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Hero Poster Image</h3>
              <ImageUpload
                onChange={(file) => {
                  setPosterFile(file);
                  if (!file) setPosterUrl("");
                }}
                currentUrl={posterUrl || null}
                label="Hero Poster Image"
              />
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Focal Point Alignment</h4>
                {alignmentButtons(imageDesktopAlignment, imageMobileAlignment, setImageDesktopAlignment, setImageMobileAlignment)}
              </div>
              {posterSave.state.success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  Poster settings saved!
                </div>
              )}
              {posterSave.state.error && (
                <p className="text-sm text-red-400">{posterSave.state.error}</p>
              )}
              <button type="button" onClick={handleSavePoster} disabled={posterSave.pending} className="admin-btn-cyan">
                {posterSave.pending ? "Saving..." : "Save Poster Image"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ─── Hero Details ─── */}
        <Card>
          <CardContent>
            <form ref={heroDetailFormRef} action={handleSaveHeroDetails} className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Hero Details</h3>
              <p className="text-sm text-gray-500">
                Control the hero title, subtitle, call-to-action buttons, and live badge.
              </p>

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
                  <Input id="ctaText" name="ctaText" label="Primary Button Text" defaultValue={heroData.ctaText} placeholder="Subscribe" />
                  <Input id="ctaLink" name="ctaLink" label="Primary Button Link" defaultValue={heroData.ctaLink} placeholder="https://youtube.com/@..." />
                  <Input id="ctaSecondaryText" name="ctaSecondaryText" label="Secondary Button Text" defaultValue={heroData.ctaSecondaryText} placeholder="Follow on IG" />
                  <Input id="ctaSecondaryLink" name="ctaSecondaryLink" label="Secondary Button Link" defaultValue={heroData.ctaSecondaryLink} placeholder="https://instagram.com/..." />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Live Badge</h4>
                <Input
                  id="liveBadgeText" name="liveBadgeText" label="Live Badge Text"
                  defaultValue={heroData.liveBadgeText} placeholder="Live on YouTube"
                  onChange={(e) => setLiveBadgeText(e.target.value)}
                />
                <label className="flex items-center gap-3">
                  <input type="checkbox" name="showLiveBadge" defaultChecked={heroData.showLiveBadge}
                    onChange={(e) => setLiveShowBadge(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-s8ul-cyan focus:ring-s8ul-cyan/50"
                  />
                  <span className="text-sm text-gray-300">Show Live Badge</span>
                </label>
              </div>

              {heroDetailsSave.state.success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  Hero details saved!
                </div>
              )}
              {heroDetailsSave.state.error && (
                <p className="text-sm text-red-400">{heroDetailsSave.state.error}</p>
              )}

              <div className="pt-2">
                <button type="submit" disabled={heroDetailsSave.pending} className="admin-btn-cyan">
                  {heroDetailsSave.pending ? "Saving..." : "Save Hero Details"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ─── Profile Picture ─── */}
        <Card>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Profile Picture</h3>
              <ImageUpload
                onChange={(file) => {
                  setProfileImageFile(file);
                  if (!file) setProfileImage("");
                }}
                currentUrl={profileImage || null}
                label="Profile Image"
              />
              {profilePicSave.state.success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  Profile picture saved!
                </div>
              )}
              {profilePicSave.state.error && (
                <p className="text-sm text-red-400">{profilePicSave.state.error}</p>
              )}
              <button type="button" onClick={handleSaveProfilePicture} disabled={profilePicSave.pending} className="admin-btn-cyan">
                {profilePicSave.pending ? "Saving..." : "Save Profile Picture"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ─── Personal Information ─── */}
        <Card>
          <CardContent>
            <form ref={profileInfoFormRef} action={handleSaveProfileInfo} className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Personal Information</h3>
              <Input
                id="name" name="name" label="Full Name" defaultValue={config.name}
                error={profileInfoSave.state.fieldErrors?.name?.[0]}
                onChange={(e) => setLiveName(e.target.value)} required
              />
              <Input
                id="tagline" name="tagline" label="Tagline" defaultValue={config.tagline}
                error={profileInfoSave.state.fieldErrors?.tagline?.[0]}
                onChange={(e) => setLiveTagline(e.target.value)} required
              />
              <Textarea
                id="bio" name="bio" label="Bio" defaultValue={config.bio}
                error={profileInfoSave.state.fieldErrors?.bio?.[0]}
                onChange={(e) => setLiveBio(e.target.value)} rows={5} required
              />

              {role === "SUPER_ADMIN" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Niche</h3>
                <div>
                  <label htmlFor="niche" className="block text-sm font-medium text-gray-300 mb-1.5">Background Theme</label>
                  <select id="niche" name="niche" defaultValue={config.niche || "gaming"} className="admin-select">
                    <option value="gaming" className="bg-gray-900 text-white">Gaming</option>
                    <option value="fitness" className="bg-gray-900 text-white">Fitness</option>
                    <option value="fashion" className="bg-gray-900 text-white">Fashion</option>
                    <option value="travel" className="bg-gray-900 text-white">Travel</option>
                    <option value="tech" className="bg-gray-900 text-white">Tech</option>
                    <option value="food" className="bg-gray-900 text-white">Food</option>
                    <option value="lifestyle" className="bg-gray-900 text-white">Lifestyle</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Controls the floating background icons on the public site.</p>
                </div>
              </div>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Social Media Links</h3>
                <p className="text-sm text-gray-500">Leave empty to hide the icon from the public site.</p>
                <Input id="instagram" name="instagram" label="Instagram URL" defaultValue={config.social.instagram} placeholder="https://instagram.com/username" />
                <Input id="youtube" name="youtube" label="YouTube URL" defaultValue={config.social.youtube} placeholder="https://youtube.com/@username" />
                <Input id="twitter" name="twitter" label="Twitter / X URL" defaultValue={config.social.twitter} placeholder="https://twitter.com/username" />
                <Input id="tiktok" name="tiktok" label="TikTok URL" defaultValue={config.social.tiktok} placeholder="https://tiktok.com/@username" />
              </div>

              {profileInfoSave.state.success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  Profile info saved!
                </div>
              )}
              {profileInfoSave.state.error && (
                <p className="text-sm text-red-400">{profileInfoSave.state.error}</p>
              )}

              <div className="flex items-center gap-4 pt-2">
                <button type="submit" disabled={profileInfoSave.pending} className="admin-btn-cyan">
                  {profileInfoSave.pending ? "Saving..." : "Save Profile Info"}
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
            <form ref={apiKeysFormRef} action={handleSaveApiKeys} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Developer / API Integrations</h3>
                <p className="text-sm text-gray-400">
                  Provide your own API keys to automatically display your latest videos and posts on your live website.
                  These are stored securely and never exposed to the client.
                </p>
                <Input
                  id="youtubeApiKey" name="youtubeApiKey" label="YouTube Data API Key" type="password"
                  value={youtubeApiKey} onChange={(e) => setYoutubeApiKey(e.target.value)}
                  placeholder="AIzaSyA-..." autoComplete="off"
                />
                <Input
                  id="instagramApiKey" name="instagramApiKey" label="Instagram Graph API Token" type="password"
                  value={instagramApiKey} onChange={(e) => setInstagramApiKey(e.target.value)}
                  placeholder="EAAloQ..." autoComplete="off"
                />
              </div>

              {apiKeysSave.state.success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  API keys saved successfully!
                </div>
              )}
              {apiKeysSave.state.error && (
                <p className="text-sm text-red-400">{apiKeysSave.state.error}</p>
              )}

              <div className="pt-2">
                <button type="submit" disabled={apiKeysSave.pending} className="admin-btn-cyan">
                  {apiKeysSave.pending ? "Saving..." : "Save API Keys"}
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
            videoUrl={videoUrl || heroData.videoUrl || ""}
            posterUrl={posterUrl || heroData.posterUrl || ""}
            videoDesktopAlignment={videoDesktopAlignment}
            videoMobileAlignment={videoMobileAlignment}
            imageDesktopAlignment={imageDesktopAlignment}
            imageMobileAlignment={imageMobileAlignment}
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
