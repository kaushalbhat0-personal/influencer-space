"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent } from "@/components/ui/Card";
import { updateInfluencerData } from "@/actions/settings.actions";
import type { InfluencerDataType } from "@/config/influencer";
import type { SettingsActionState } from "@/actions/settings.actions";

export function SettingsForm({
  config,
}: {
  config: InfluencerDataType;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<SettingsActionState>({ success: false });
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setState({ success: false });
    const result = await updateInfluencerData(state, formData);
    setState(result);
    setPending(false);

    if (result.success) {
      router.refresh();
    }
  }

  return (
    <Card>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Personal Information
            </h3>
            <Input
              id="name"
              name="name"
              label="Full Name"
              defaultValue={config.name}
              error={state.fieldErrors?.name?.[0]}
              required
            />
            <Input
              id="tagline"
              name="tagline"
              label="Tagline"
              defaultValue={config.tagline}
              error={state.fieldErrors?.tagline?.[0]}
              required
            />
            <Textarea
              id="bio"
              name="bio"
              label="Bio"
              defaultValue={config.bio}
              error={state.fieldErrors?.bio?.[0]}
              rows={5}
              required
            />
            <Input
              id="profileImage"
              name="profileImage"
              label="Profile Image URL"
              defaultValue={config.profileImage || ""}
              placeholder="https://example.com/profile.jpg"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Social Media Links
            </h3>
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

          {state.success && (
            <div className="rounded-lg bg-green-100 p-3 text-sm text-green-700">
              Settings updated successfully!
            </div>
          )}
          {state.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin")}
            >
              Back to Dashboard
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
