/**
 * Hero video server-side validation (RCCF-59).
 *
 * Hero videos are ISO-BMFF (MP4 / QuickTime) only — the ONLY formats whose
 * duration can be parsed authoritatively server-side from the container. WebM /
 * Ogg are rejected for the hero (their duration is not reliably parseable in
 * this runtime, so the 15-second constraint could not be enforced truthfully).
 *
 * The MP4 duration is parsed from the moov/mvhd box; when it cannot be
 * extracted the upload is REJECTED (fail closed) rather than trusted from the
 * client. Size and the total-storage quota are enforced separately.
 */

export interface HeroVideoRules {
  enabled: boolean;
  maxSizeBytes: number;
  maxDurationSec: number;
}

const HERO_VIDEO_MIMES = ["video/mp4", "video/quicktime"];

/** Parse the duration of an ISO-BMFF (MP4/QuickTime) buffer in seconds, or null. */
export function parseMp4Duration(buffer: Buffer): number | null {
  let offset = 0;
  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (size < 8) return null;
    if (type === "moov") {
      const mvhd = findBox(buffer, offset + 8, Math.min(size - 8, buffer.length - offset - 8), "mvhd");
      if (!mvhd) return null;
      return readMvhdDuration(mvhd);
    }
    offset += size;
  }
  return null;
}

/** Find a child box by type within a byte range. */
function findBox(buffer: Buffer, start: number, length: number, target: string): Buffer | null {
  let offset = start;
  const end = start + length;
  while (offset + 8 <= end) {
    const size = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (size < 8) return null;
    if (type === target) {
      return buffer.subarray(offset, offset + size);
    }
    offset += size;
  }
  return null;
}

/** Parse duration (seconds) from an mvhd box payload. */
function readMvhdDuration(mvhd: Buffer): number | null {
  if (mvhd.length < 28) return null;
  const version = mvhd.readUInt8(8);
  let timescale: number;
  let duration: number;
  if (version === 1) {
    if (mvhd.length < 40) return null;
    timescale = mvhd.readUInt32BE(28);
    duration = Number(mvhd.readBigUInt64BE(32));
  } else {
    if (mvhd.length < 28) return null;
    timescale = mvhd.readUInt32BE(20);
    duration = mvhd.readUInt32BE(24);
  }
  if (!timescale || timescale <= 0 || duration <= 0) return null;
  return duration / timescale;
}

/**
 * Validate a hero video against the plan's canonical hero capability.
 * Returns an error message (null when valid). The caller throws a
 * MediaValidationError with this message.
 */
export function validateHeroVideo(params: {
  mimeType: string;
  size: number;
  buffer: Buffer;
  rules: HeroVideoRules;
}): string | null {
  const { mimeType, size, buffer, rules } = params;

  if (!rules.enabled) {
    return "Hero video is not available on your current plan.";
  }
  if (!HERO_VIDEO_MIMES.includes(mimeType)) {
    return "Unsupported hero video format. MP4 is required for hero videos.";
  }
  if (size > rules.maxSizeBytes) {
    return `Hero video too large: ${(size / 1024 / 1024).toFixed(1)} MB. Maximum: ${(rules.maxSizeBytes / 1024 / 1024).toFixed(0)} MB.`;
  }
  const duration = parseMp4Duration(buffer);
  if (duration === null) {
    return "Could not verify hero video duration. Re-encode as MP4 and try again.";
  }
  if (duration > rules.maxDurationSec) {
    return `Hero video too long: ${duration.toFixed(1)} seconds. Maximum: ${rules.maxDurationSec} seconds.`;
  }
  return null;
}
