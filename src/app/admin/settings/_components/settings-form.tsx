"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent } from "@/components/ui/Card";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { VideoUpload } from "@/components/ui/VideoUpload";
import { StorageService } from "@/services/storage.service";
import { updateInfluencerData, updateHeroData } from "@/actions/settings.actions";
import type { InfluencerDataType } from "@/config/influencer";
import type { HeroDataType } from "@/config/hero";
import type { SettingsActionState } from "@/actions/settings.actions";

export function SettingsForm({
  config,
  heroData,
}: {
  config: InfluencerDataType;
  heroData: HeroDataType;
}) {
  const router = useRouter();
  const profileFormRef = useRef<HTMLFormElement>(null);
  const heroFormRef = useRef<HTMLFormElement>(null);
  const [profileState, setProfileState] = useState<SettingsActionState>({ success: false });
  const [heroState, setHeroState] = useState<SettingsActionState>({ success: false });
  const [profilePending, setProfilePending] = useState(false);
  const [heroPending, setHeroPending] = useState(false);
  const [profileImage, setProfileImage] = useState<string>(config.profileImage || "");
  const [videoUrl, setVideoUrl] = useState<string>(heroData.videoUrl || "");
  const [posterUrl, setPosterUrl] = useState<string>(heroData.posterUrl || "");

  async function handleImageDelete(url: string) {
    const path = StorageService.extractPathFromUrl(url);
    if (path) await StorageService.delete(path);
  }

  async function handleProfileSubmit(formData: FormData) {
    if (profileImage) formData.set("profileImage", profileImage);
    setProfilePending(true);
    setProfileState({ success: false });
    const result = await updateInfluencerData(profileState, formData);
    setProfileState(result);
    setProfilePending(false);
    if (result.success) router.refresh();
  }

  async function handleHeroSubmit(formData: FormData) {
    if (videoUrl) formData.set("videoUrl", videoUrl);
    if (posterUrl) formData.set("posterUrl", posterUrl);
    setHeroPending(true);
    setHeroState({ success: false });
    const result = await updateHeroData(heroState, formData);
    setHeroState(result);
    setHeroPending(false);
    if (result.success) router.refresh();
  }

  return (
    <div className="space-y-8">
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
                required
              />
              <Input
                id="tagline"
                name="tagline"
                label="Tagline"
                defaultValue={config.tagline}
                error={profileState.fieldErrors?.tagline?.[0]}
                required
              />
              <Textarea
                id="bio"
                name="bio"
                label="Bio"
                defaultValue={config.bio}
                error={profileState.fieldErrors?.bio?.[0]}
                rows={5}
                required
              />
              <ImageUpload
                onUpload={setProfileImage}
                onDelete={handleImageDelete}
                currentImage={profileImage || null}
                folder="profile"
                label="Profile Image"
              />
            </div>

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

      <Card>
        <CardContent>
          <form ref={heroFormRef} action={handleHeroSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Hero Section</h3>
              <p className="text-sm text-gray-500">
                Control the hero video, title, subtitle, and call-to-action buttons on the landing page.
              </p>

              <VideoUpload
                onUpload={setVideoUrl}
                onDelete={handleImageDelete}
                currentVideo={videoUrl || null}
                folder="hero"
                label="Hero Video"
              />

              <ImageUpload
                onUpload={setPosterUrl}
                onDelete={handleImageDelete}
                currentImage={posterUrl || null}
                folder="hero"
                label="Hero Poster Image"
              />

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
            </div>

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
              />
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="showLiveBadge"
                  defaultChecked={heroData.showLiveBadge}
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
    </div>
  );
}
