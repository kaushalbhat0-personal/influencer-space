"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent } from "@/components/ui/Card";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { StorageService } from "@/services/storage.service";
import { createTimelineEvent, updateTimelineEvent } from "@/actions/timeline.actions";
import { TIMELINE_ROUTE } from "@/lib/constants";
import type { TimelineEventData } from "@/services/timeline.service";
import type { TimelineActionState } from "@/actions/timeline.actions";

type Props =
  | { mode: "create"; event?: never }
  | { mode: "edit"; event: TimelineEventData };

export function TimelineForm({ mode, event }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<TimelineActionState>({ success: false });
  const [pending, setPending] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(event?.imageUrl || "");

  const serverAction = mode === "create" ? createTimelineEvent : updateTimelineEvent;

  async function handleImageDelete(url: string) {
    const path = StorageService.extractPathFromUrl(url);
    if (path) await StorageService.delete(path);
    setImageUrl("");
  }

  async function handleSubmit(formData: FormData) {
    if (imageUrl) formData.set("imageUrl", imageUrl);
    setPending(true);
    setState({ success: false });
    const result = await serverAction(state, formData);
    setState(result);
    setPending(false);
    if (result.success) {
      router.push(TIMELINE_ROUTE);
      router.refresh();
    }
  }

  return (
    <Card>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="space-y-6">
          {mode === "edit" && event && <input type="hidden" name="id" value={event.id} />}

          <Input
            id="year"
            name="year"
            label="Year (e.g. 2022, 2022-2024)"
            defaultValue={event?.year ?? ""}
            error={state.fieldErrors?.year?.[0]}
            required
          />

          <Input
            id="title"
            name="title"
            label="Title"
            defaultValue={event?.title ?? ""}
            error={state.fieldErrors?.title?.[0]}
            required
          />

          <Textarea
            id="description"
            name="description"
            label="Description"
            defaultValue={event?.description ?? ""}
            error={state.fieldErrors?.description?.[0]}
            rows={4}
            required
          />

          <Input
            id="stats"
            name="stats"
            label="Stat Badge (optional, e.g. '3x Champion')"
            defaultValue={event?.stats ?? ""}
            placeholder="e.g. 3x Champion"
          />

          <ImageUpload
            onUpload={setImageUrl}
            onDelete={handleImageDelete}
            currentImage={imageUrl || null}
            folder="timeline"
            label="Event Image (optional)"
          />

          {state.error && <p className="text-sm text-red-400">{state.error}</p>}

          <div className="flex items-center gap-4 pt-2">
            <button type="submit" disabled={pending} className="admin-btn-cyan">
              {pending ? "Saving..." : mode === "create" ? "Create Event" : "Save Changes"}
            </button>
            <button type="button" onClick={() => router.push(TIMELINE_ROUTE)} className="admin-btn-outline">
              Cancel
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
