"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { MediaUploadField } from "@/components/shared/MediaUploadField";
import { updateHeroData, updateHeroPartial, updateApiKeys } from "@/actions/settings.actions";
import { SettingsLivePreview } from "./settings-live-preview";
import type { HeroDataType } from "@/config/hero";
import type { SettingsActionState } from "@/actions/settings.types";

type SaveState = { pending: boolean; state: SettingsActionState };

function emptyState(): SaveState {
  return { pending: false, state: { success: false } };
}

export function SettingsForm({
  heroData,
  youtubeKeyConfigured,
  instagramKeyConfigured,
  tenantId,
}: {
  heroData: HeroDataType;
  youtubeKeyConfigured: boolean;
  instagramKeyConfigured: boolean;
  tenantId: string;
}) {
  const router = useRouter();
  const heroDetailFormRef = useRef<HTMLFormElement>(null);
  const apiKeysFormRef = useRef<HTMLFormElement>(null);

  const [videoSave, setVideoSave] = useState<SaveState>(emptyState);
  const [posterSave, setPosterSave] = useState<SaveState>(emptyState);
  const [heroDetailsSave, setHeroDetailsSave] = useState<SaveState>(emptyState);
  const [apiKeysSave, setApiKeysSave] = useState<SaveState>(emptyState);

  const [videoUrl, setVideoUrl] = useState<string>(heroData.videoUrl || "");
  const [posterUrl, setPosterUrl] = useState<string>(heroData.posterUrl || "");

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

  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [instagramApiKey, setInstagramApiKey] = useState("");

  const [liveBadgeText, setLiveBadgeText] = useState(heroData.liveBadgeText || "");
  const [liveShowBadge, setLiveShowBadge] = useState<boolean>(!!heroData.showLiveBadge);

  const [heroTitle, setHeroTitle] = useState(heroData.title || "");
  const [heroSubtitle, setHeroSubtitle] = useState(heroData.subtitle || "");
  const [heroTagline, setHeroTagline] = useState(heroData.tagline || "");
  const [ctaText, setCtaText] = useState(heroData.ctaText || "");
  const [ctaLink, setCtaLink] = useState(heroData.ctaLink || "");
  const [ctaSecondaryText, setCtaSecondaryText] = useState(heroData.ctaSecondaryText || "");
  const [ctaSecondaryLink, setCtaSecondaryLink] = useState(heroData.ctaSecondaryLink || "");

  useEffect(() => { setHeroTitle(heroData.title || ""); }, [heroData.title]);
  useEffect(() => { setHeroSubtitle(heroData.subtitle || ""); }, [heroData.subtitle]);
  useEffect(() => { setHeroTagline(heroData.tagline || ""); }, [heroData.tagline]);
  useEffect(() => { setCtaText(heroData.ctaText || ""); }, [heroData.ctaText]);
  useEffect(() => { setCtaLink(heroData.ctaLink || ""); }, [heroData.ctaLink]);
  useEffect(() => { setCtaSecondaryText(heroData.ctaSecondaryText || ""); }, [heroData.ctaSecondaryText]);
  useEffect(() => { setCtaSecondaryLink(heroData.ctaSecondaryLink || ""); }, [heroData.ctaSecondaryLink]);
  useEffect(() => { setLiveBadgeText(heroData.liveBadgeText || ""); }, [heroData.liveBadgeText]);
  useEffect(() => { setLiveShowBadge(!!heroData.showLiveBadge); }, [heroData.showLiveBadge]);
  useEffect(() => { setVideoUrl(heroData.videoUrl || ""); }, [heroData.videoUrl]);
  useEffect(() => { setPosterUrl(heroData.posterUrl || ""); }, [heroData.posterUrl]);

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
    formData.set("videoUrl", videoUrl);
    formData.set("videoDesktopAlignment", videoDesktopAlignment);
    formData.set("videoMobileAlignment", videoMobileAlignment);

    const result = await updateHeroData(tenantId, { success: false }, formData);
    setVideoSave({ pending: false, state: result });

    if (result.success) {
      setTimeout(() => router.refresh(), 50);
    }
  }

  async function handleSavePoster() {
    setPosterSave({ pending: true, state: { success: false } });

    const formData = new FormData();
    formData.set("posterUrl", posterUrl);
    formData.set("imageDesktopAlignment", imageDesktopAlignment);
    formData.set("imageMobileAlignment", imageMobileAlignment);

    const result = await updateHeroData(tenantId, { success: false }, formData);
    setPosterSave({ pending: false, state: result });

    if (result.success) {
      setTimeout(() => router.refresh(), 50);
    }
  }

  async function handleSaveHeroDetails() {
    setHeroDetailsSave({ pending: true, state: { success: false } });

    const payload = {
      title: heroTitle,
      subtitle: heroSubtitle,
      tagline: heroTagline,
      ctaText,
      ctaLink,
      ctaSecondaryText,
      ctaSecondaryLink,
      liveBadgeText,
      showLiveBadge: liveShowBadge,
    };

    const result = await updateHeroPartial(tenantId, payload);

    if (result.success) {
      setTimeout(() => router.refresh(), 50);
    }

    setHeroDetailsSave({ pending: false, state: result });
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
              <MediaUploadField
                label="Hero Video"
                currentUrl={videoUrl}
                folder="hero"
                accept="video/*"
                onUploadComplete={({ url }) => setVideoUrl(url)}
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
              <MediaUploadField
                label="Hero Poster Image"
                currentUrl={posterUrl}
                folder="hero"
                accept="image/*"
                onUploadComplete={({ url }) => setPosterUrl(url)}
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
            <form ref={heroDetailFormRef} onSubmit={(e) => { e.preventDefault(); handleSaveHeroDetails(); }} className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Hero Details</h3>
              <p className="text-sm text-gray-500">
                Control the hero title, subtitle, call-to-action buttons, and live badge.
              </p>

              <Input
                id="heroTitle"
                label="Title"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder="Raj 'Snax' Varma"
              />
              <Input
                id="heroSubtitle"
                label="Subtitle"
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                placeholder="S8UL Esports | BGMI Pro | Content Creator"
              />
              <Input
                id="heroTagline"
                label="Tagline"
                value={heroTagline}
                onChange={(e) => setHeroTagline(e.target.value)}
                placeholder="Hyderabad ki energy — global level ka game."
              />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Call-to-Action Buttons</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input id="ctaText" label="Primary Button Text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Subscribe" />
                  <Input id="ctaLink" label="Primary Button Link" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} placeholder="https://youtube.com/@..." />
                  <Input id="ctaSecondaryText" label="Secondary Button Text" value={ctaSecondaryText} onChange={(e) => setCtaSecondaryText(e.target.value)} placeholder="Follow on IG" />
                  <Input id="ctaSecondaryLink" label="Secondary Button Link" value={ctaSecondaryLink} onChange={(e) => setCtaSecondaryLink(e.target.value)} placeholder="https://instagram.com/..." />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Live Badge</h4>
                <Input
                  id="liveBadgeText" label="Live Badge Text"
                  value={liveBadgeText} placeholder="Live on YouTube"
                  onChange={(e) => setLiveBadgeText(e.target.value)}
                />
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={liveShowBadge}
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
                <button type="button" onClick={handleSaveHeroDetails} disabled={heroDetailsSave.pending} className="admin-btn-cyan">
                  {heroDetailsSave.pending ? "Saving..." : "Save Hero Details"}
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
                  placeholder={youtubeKeyConfigured ? "Configured — type to replace" : "Enter YouTube API Key"}
                  autoComplete="off"
                />
                <Input
                  id="instagramApiKey" name="instagramApiKey" label="Instagram Graph API Token" type="password"
                  value={instagramApiKey} onChange={(e) => setInstagramApiKey(e.target.value)}
                  placeholder={instagramKeyConfigured ? "Configured — type to replace" : "Enter Instagram Graph Token"}
                  autoComplete="off"
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
            profileUrl={null}
            name=""
            tagline={heroTagline}
            bio=""
            liveBadgeText={liveBadgeText}
            showLiveBadge={liveShowBadge}
          />
        </div>
      </div>
    </div>
  );
}
