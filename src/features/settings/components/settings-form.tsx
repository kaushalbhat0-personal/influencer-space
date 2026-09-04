"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { MediaField, type MediaValue } from "@/components/shared/MediaField";
import { updateHeroData, updateHeroPartial } from "@/actions/settings.actions";
import { SettingsLivePreview } from "./settings-live-preview";
import type { HeroDataType } from "@/config/hero";
import type { SettingsActionState } from "@/actions/settings.types";

type SaveState = { pending: boolean; state: SettingsActionState };

function emptyState(): SaveState {
  return { pending: false, state: { success: false } };
}

export function SettingsForm({
  heroData,
  tenantId,
  heroPresentation,
}: {
  heroData: HeroDataType;
  tenantId: string;
  /**
   * RCCF-71.3: persisted HERO PRESENTATION (Website.themeConfig) threaded from
   * the settings server page into the canonical preview renderer.
   */
  heroPresentation?: { textAlign?: string; contentWidth?: string; overlay?: string };
}) {
  const router = useRouter();
  const heroMediaFormRef = useRef<HTMLFormElement>(null);

  const [mediaSave, setMediaSave] = useState<SaveState>(emptyState);
  const [backgroundSave, setBackgroundSave] = useState<SaveState>(emptyState);
  const [identitySave, setIdentitySave] = useState<SaveState>(emptyState);
  const [buttonsSave, setButtonsSave] = useState<SaveState>(emptyState);
  const [liveBadgeSave, setLiveBadgeSave] = useState<SaveState>(emptyState);

  const [videoUrl, setVideoUrl] = useState<string>(heroData.videoUrl || "");
  const [posterUrl, setPosterUrl] = useState<string>(heroData.posterUrl || "");
  const [videoAssetId, setVideoAssetId] = useState<string>(heroData.videoAssetId || "");
  const [posterAssetId, setPosterAssetId] = useState<string>(heroData.posterAssetId || "");
  const [backgroundUrl, setBackgroundUrl] = useState(heroData.backgroundUrl || "");
  const [backgroundAssetId, setBackgroundAssetId] = useState(heroData.backgroundAssetId || "");

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

  const [creatorName, setCreatorName] = useState(heroData.name || "");
  const [profilePictureUrl, setProfilePictureUrl] = useState(heroData.profilePictureUrl || "");
  const [profilePictureAssetId, setProfilePictureAssetId] = useState(heroData.profilePictureAssetId || "");
  const [heroTitle, setHeroTitle] = useState(heroData.title || "");
  const [heroSubtitle, setHeroSubtitle] = useState(heroData.subtitle || "");
  const [heroTagline, setHeroTagline] = useState(heroData.tagline || "");
  const [heroBio, setHeroBio] = useState(heroData.bio || "");

  const [ctaText, setCtaText] = useState(heroData.ctaText || "");
  const [ctaLink, setCtaLink] = useState(heroData.ctaLink || "");
  const [ctaSecondaryText, setCtaSecondaryText] = useState(heroData.ctaSecondaryText || "");
  const [ctaSecondaryLink, setCtaSecondaryLink] = useState(heroData.ctaSecondaryLink || "");

  const [liveBadgeText, setLiveBadgeText] = useState(heroData.liveBadgeText || "");
  const [liveShowBadge, setLiveShowBadge] = useState<boolean>(!!heroData.showLiveBadge);

  function alignmentButtons(
    desktopAlign: string,
    mobileAlign: string,
    onDesktop: (a: "top" | "center" | "bottom") => void,
    onMobile: (a: "top" | "center" | "bottom") => void,
  ) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="platform-metadata mb-1.5 block">Desktop</label>
          <div className="flex gap-1">
            {(["top", "center", "bottom"] as const).map((a) => (
              <button
                key={`d-${a}`}
                type="button"
                onClick={() => onDesktop(a)}
                className={`flex-1 rounded-[var(--radius-md)] px-2 py-1.5 text-[11px] font-medium tracking-wide transition-colors ${
                  desktopAlign === a
                    ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-strong)]"
                    : "bg-[var(--surface-card)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border)]"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="platform-metadata mb-1.5 block">Mobile</label>
          <div className="flex gap-1">
            {(["top", "center", "bottom"] as const).map((a) => (
              <button
                key={`m-${a}`}
                type="button"
                onClick={() => onMobile(a)}
                className={`flex-1 rounded-[var(--radius-md)] px-2 py-1.5 text-[11px] font-medium tracking-wide transition-colors ${
                  mobileAlign === a
                    ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-strong)]"
                    : "bg-[var(--surface-card)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border)]"
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

  function flash(routerRefresh: boolean) {
    if (routerRefresh) setTimeout(() => router.refresh(), 50);
  }

  async function handleSaveMedia(overrides?: { videoUrl?: string; videoAssetId?: string; posterUrl?: string; posterAssetId?: string }) {
    setMediaSave({ pending: true, state: { success: false } });
    const formData = new FormData();
    formData.set("videoUrl", overrides?.videoUrl ?? videoUrl);
    formData.set("videoAssetId", overrides?.videoAssetId ?? videoAssetId);
    formData.set("posterUrl", overrides?.posterUrl ?? posterUrl);
    formData.set("posterAssetId", overrides?.posterAssetId ?? posterAssetId);
    formData.set("videoDesktopAlignment", videoDesktopAlignment);
    formData.set("videoMobileAlignment", videoMobileAlignment);
    formData.set("imageDesktopAlignment", imageDesktopAlignment);
    formData.set("imageMobileAlignment", imageMobileAlignment);
    const result = await updateHeroData(tenantId, { success: false }, formData);
    setMediaSave({ pending: false, state: result });
    if (result.success) flash(true);
  }

  async function handleSaveBackground(overrides?: { backgroundUrl?: string; backgroundAssetId?: string }) {
    // RCCF-70.5.2: the upload handler must pass the NEW value explicitly —
    // reading state from the closure here would capture the value from the
    // render BEFORE the MediaField onChange committed, silently dropping the
    // first background save (mirrors the video/poster override pattern).
    // RCCF-72.12: the `|| null` below is the canonical CLEAR payload — the
    // server schema now accepts null so a cleared background persists.
    setBackgroundSave({ pending: true, state: { success: false } });
    const result = await updateHeroPartial(tenantId, {
      backgroundUrl: (overrides?.backgroundUrl ?? backgroundUrl) || null,
      backgroundAssetId: (overrides?.backgroundAssetId ?? backgroundAssetId) || null,
    });
    setBackgroundSave({ pending: false, state: result });
    if (result.success) flash(true);
  }

  async function handleSaveIdentity(overrides?: { profilePictureUrl?: string; profilePictureAssetId?: string }) {
    setIdentitySave({ pending: true, state: { success: false } });
    const result = await updateHeroPartial(tenantId, {
      name: creatorName,
      title: heroTitle,
      subtitle: heroSubtitle,
      tagline: heroTagline,
      bio: heroBio,
      profilePictureUrl: (overrides?.profilePictureUrl ?? profilePictureUrl) || null,
      profilePictureAssetId: (overrides?.profilePictureAssetId ?? profilePictureAssetId) || null,
    });
    setIdentitySave({ pending: false, state: result });
    if (result.success) flash(true);
  }

  async function handleSaveButtons() {
    setButtonsSave({ pending: true, state: { success: false } });
    const result = await updateHeroPartial(tenantId, {
      ctaText,
      ctaLink,
      ctaSecondaryText,
      ctaSecondaryLink,
    });
    setButtonsSave({ pending: false, state: result });
    if (result.success) flash(true);
  }

  async function handleSaveLiveBadge() {
    setLiveBadgeSave({ pending: true, state: { success: false } });
    const result = await updateHeroPartial(tenantId, {
      liveBadgeText,
      showLiveBadge: liveShowBadge,
    });
    setLiveBadgeSave({ pending: false, state: result });
    if (result.success) flash(true);
  }

  function mediaField(field: string, onChange: (v: MediaValue | null) => void) {
    return (v: MediaValue | null) => onChange(v);
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8 items-start">
      <div className="space-y-6">
        {/* ─── Hero Media (video · poster · background) ─── primary elevated */}
        <Card variant="primary">
          <CardContent>
            <form ref={heroMediaFormRef} onSubmit={(e) => { e.preventDefault(); handleSaveMedia(); }} className="space-y-5">
              <h3 className="font-display text-lg font-semibold tracking-tight text-[var(--text-primary)]">Hero Media</h3>
              <p className="platform-body">
                The media renders first, full-width, behind your profile picture. Video takes priority over the poster.
              </p>

              <MediaField
                label="Hero Video"
                value={{ url: videoUrl, assetId: videoAssetId }}
                folder="hero"
                accept="video/mp4,video/quicktime"
                entityType="hero"
                entityId={tenantId}
                entityField="videoUrl"
                onChange={mediaField("videoUrl", (v) => {
                  setVideoUrl(v?.url ?? "");
                  setVideoAssetId(v?.assetId ?? "");
                })}
                onUploadComplete={(v) => handleSaveMedia({ videoUrl: v.url ?? "", videoAssetId: v.assetId ?? "" })}
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                MP4 only · up to 15 seconds · max 12 MB. Hero videos count toward your plan&apos;s storage quota.
              </p>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Video Focal Point Alignment</h4>
                {alignmentButtons(videoDesktopAlignment, videoMobileAlignment, setVideoDesktopAlignment, setVideoMobileAlignment)}
              </div>

              <MediaField
                label="Hero Poster Image"
                value={{ url: posterUrl, assetId: posterAssetId }}
                folder="hero"
                accept="image/*"
                entityType="hero"
                entityId={tenantId}
                entityField="posterUrl"
                onChange={mediaField("posterUrl", (v) => {
                  setPosterUrl(v?.url ?? "");
                  setPosterAssetId(v?.assetId ?? "");
                })}
                onUploadComplete={(v) => handleSaveMedia({ posterUrl: v.url ?? "", posterAssetId: v.assetId ?? "" })}
              />
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Poster Focal Point Alignment</h4>
                {alignmentButtons(imageDesktopAlignment, imageMobileAlignment, setImageDesktopAlignment, setImageMobileAlignment)}
              </div>

              <MediaField
                label="Hero Background Image"
                value={{ url: backgroundUrl, assetId: backgroundAssetId }}
                folder="hero"
                accept="image/*"
                entityType="hero"
                entityId={tenantId}
                entityField="backgroundUrl"
                onChange={mediaField("backgroundUrl", (v) => {
                  setBackgroundUrl(v?.url ?? "");
                  setBackgroundAssetId(v?.assetId ?? "");
                })}
                onUploadComplete={(v) => handleSaveBackground({ backgroundUrl: v.url ?? "", backgroundAssetId: v.assetId ?? "" })}
              />
              {backgroundSave.state.success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  Background saved!
                </div>
              )}
              {backgroundSave.state.error && (
                <p className="text-sm text-red-400">{backgroundSave.state.error}</p>
              )}

              {mediaSave.state.success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  Hero media saved!
                </div>
              )}
              {mediaSave.state.error && (
                <p className="text-sm text-red-400">{mediaSave.state.error}</p>
              )}
              <div className="pt-1">
                <button type="submit" disabled={mediaSave.pending} className="admin-btn-cyan">
                  {mediaSave.pending ? "Saving..." : "Save Hero Media"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ─── Creator Identity ─── secondary quiet */}
        <Card variant="secondary">
          <CardContent>
            <div className="space-y-5">
              <h3 className="font-display text-base font-semibold tracking-tight text-[var(--text-primary)]">Creator Identity</h3>
              <p className="platform-body text-sm">
                Your public identity — the profile picture, name, headline, tagline and bio shown in the Hero. Owned by Hero.
              </p>
              <MediaField
                label="Profile Picture"
                value={{ url: profilePictureUrl, assetId: profilePictureAssetId }}
                folder="profile"
                accept="image/*"
                entityType="hero"
                entityId={tenantId}
                entityField="profilePictureUrl"
                onChange={mediaField("profilePictureUrl", (v) => {
                  setProfilePictureUrl(v?.url ?? "");
                  setProfilePictureAssetId(v?.assetId ?? "");
                })}
                onUploadComplete={(v) => handleSaveIdentity({ profilePictureUrl: v.url ?? "", profilePictureAssetId: v.assetId ?? "" })}
              />
              <Input
                id="creatorName"
                label="Name"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Farah Khan"
              />
              <Input
                id="heroTitle"
                label="Headline"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder="S8UL Esports | BGMI Pro | Content Creator"
              />
              <Input
                id="creatorTagline"
                label="Tagline"
                value={heroTagline}
                onChange={(e) => setHeroTagline(e.target.value)}
                placeholder="Your tagline"
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)]" htmlFor="creatorBio">
                  Bio
                </label>
                <textarea
                  id="creatorBio"
                  value={heroBio}
                  onChange={(e) => setHeroBio(e.target.value)}
                  rows={3}
                  placeholder="A short bio shown in the hero."
                  className="admin-input w-full resize-y"
                />
              </div>
              {identitySave.state.success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  Identity saved!
                </div>
              )}
              {identitySave.state.error && (
                <p className="text-sm text-red-400">{identitySave.state.error}</p>
              )}
              <button type="button" onClick={() => handleSaveIdentity()} disabled={identitySave.pending} className="admin-btn-cyan">
                {identitySave.pending ? "Saving..." : "Save Identity"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ─── Buttons ─── secondary */}
        <Card variant="secondary">
          <CardContent>
            <div className="space-y-4">
              <h3 className="font-display text-base font-semibold tracking-tight text-[var(--text-primary)]">Buttons</h3>
              <p className="platform-body text-sm">Call-to-action buttons shown in the Hero.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="ctaText" label="Primary Button Text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Subscribe" />
                <Input id="ctaLink" label="Primary Button Link" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} placeholder="https://youtube.com/@..." />
                <Input id="ctaSecondaryText" label="Secondary Button Text" value={ctaSecondaryText} onChange={(e) => setCtaSecondaryText(e.target.value)} placeholder="Follow on IG" />
                <Input id="ctaSecondaryLink" label="Secondary Button Link" value={ctaSecondaryLink} onChange={(e) => setCtaSecondaryLink(e.target.value)} placeholder="https://instagram.com/..." />
              </div>
              {buttonsSave.state.success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  Buttons saved!
                </div>
              )}
              {buttonsSave.state.error && (
                <p className="text-sm text-red-400">{buttonsSave.state.error}</p>
              )}
              <button type="button" onClick={handleSaveButtons} disabled={buttonsSave.pending} className="admin-btn-cyan">
                {buttonsSave.pending ? "Saving..." : "Save Buttons"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ─── Live Badge ─── secondary */}
        <Card variant="secondary">
          <CardContent>
            <div className="space-y-4">
              <h3 className="font-display text-base font-semibold tracking-tight text-[var(--text-primary)]">Live Badge</h3>
              <p className="platform-body text-sm">A live/streaming indicator shown in the Hero.</p>
              <Input
                id="liveBadgeText" label="Live Badge Text"
                value={liveBadgeText} placeholder="Live on YouTube"
                onChange={(e) => setLiveBadgeText(e.target.value)}
              />
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={liveShowBadge}
                  onChange={(e) => setLiveShowBadge(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] bg-[var(--surface-input)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/30"
                />
                <span className="text-sm text-[var(--text-secondary)]">Show Live Badge</span>
              </label>
              {liveBadgeSave.state.success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  Live badge saved!
                </div>
              )}
              {liveBadgeSave.state.error && (
                <p className="text-sm text-red-400">{liveBadgeSave.state.error}</p>
              )}
              <button type="button" onClick={handleSaveLiveBadge} disabled={liveBadgeSave.pending} className="admin-btn-cyan">
                {liveBadgeSave.pending ? "Saving..." : "Save Live Badge"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="sticky top-6 hidden xl:block">
        <div className="platform-card-secondary p-4">
          <p className="platform-section-label mb-3 text-center">
            Live Preview
          </p>
          <SettingsLivePreview
            videoUrl={videoUrl || heroData.videoUrl || ""}
            posterUrl={posterUrl || heroData.posterUrl || ""}
            backgroundUrl={backgroundUrl || heroData.backgroundUrl || ""}
            videoDesktopAlignment={videoDesktopAlignment}
            videoMobileAlignment={videoMobileAlignment}
            imageDesktopAlignment={imageDesktopAlignment}
            imageMobileAlignment={imageMobileAlignment}
            profileUrl={profilePictureUrl || heroData.profilePictureUrl || null}
            name={creatorName || heroData.name || ""}
            title={heroTitle || heroData.title || ""}
            subtitle={heroSubtitle || heroData.subtitle || ""}
            tagline={heroTagline || heroData.tagline || ""}
            bio={heroBio || heroData.bio || ""}
            ctaText={ctaText || heroData.ctaText || ""}
            ctaLink={ctaLink || heroData.ctaLink || ""}
            ctaSecondaryText={ctaSecondaryText || heroData.ctaSecondaryText || ""}
            ctaSecondaryLink={ctaSecondaryLink || heroData.ctaSecondaryLink || ""}
            liveBadgeText={liveBadgeText}
            showLiveBadge={liveShowBadge}
            socialLinks={heroData.socialLinks}
            textAlign={heroPresentation?.textAlign}
            contentWidth={heroPresentation?.contentWidth}
            overlay={heroPresentation?.overlay}
          />
        </div>
      </div>
    </div>
  );
}
