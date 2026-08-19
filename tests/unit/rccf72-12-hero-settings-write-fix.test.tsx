// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, cleanup } from "@testing-library/react";

// RCCF-72.12 — Hero Settings Write Fix (closes 72.1-F1 + F9).
//
// Root cause: the settings form sends `profilePictureUrl: null` when a creator
// has no profile picture (or clears one), but the server schema used
// `z.string().optional()`, which REJECTS null → "Invalid hero data" → every
// "Save Identity" without a picture failed. The same null payload broke
// background clear.
//
// Canonical null/optional semantics (persistence contract — patchHeroData JSONB
// merge treats JSON null as "remove this key"):
//   - omitted (undefined) → leave unchanged (sparse patch)
//   - null              → explicit CLEAR → JSON null → key removed
//   - "" (empty string) → normalized to JSON null → same CLEAR result
//
// These tests pin: null is a valid write payload, clears persist, unrelated
// fields are untouched (sparse), validation errors are structured + friendly
// (no zod/DB internals), and the renderer renders the persisted picture state.

const h = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockTransaction: vi.fn(),
  mockPatchHeroData: vi.fn(),
  mockGetHeroData: vi.fn(),
  mockLogAction: vi.fn(),
  mockAfterContentChange: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockAssertHeroVideoAsset: vi.fn(),
  mockCaptureError: vi.fn(),
  mockAssertAnyCapability: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: h.mockTransaction },
}));
vi.mock("@/services/settings.service", () => ({
  SettingsService: {
    patchHeroData: h.mockPatchHeroData,
    getHeroData: h.mockGetHeroData,
  },
}));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));
vi.mock("@/lib/publishing/content-change", () => ({
  afterContentChange: h.mockAfterContentChange,
}));
vi.mock("next/cache", () => ({ revalidatePath: h.mockRevalidatePath }));
vi.mock("@/lib/media/service", () => ({
  mediaService: { assertHeroVideoAsset: h.mockAssertHeroVideoAsset },
}));
vi.mock("@/lib/observability/error-tracker", () => ({
  captureError: h.mockCaptureError,
}));
vi.mock("@/modules/billing/application/capability-gates", () => ({
  assertAnyCapability: h.mockAssertAnyCapability,
}));
vi.mock("@/lib/supabase", () => ({
  BUCKET: "influencer-images",
  supabaseClient: {},
  supabaseAdmin: {},
}));
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return {
    ...actual,
    useFormState: vi.fn((_action: unknown, initialState: unknown) => [initialState, vi.fn()]),
  };
});

import { updateHeroData, updateHeroPartial } from "@/actions/settings.actions";
import { HeroRenderer } from "@/lib/registry/components/renderers";

const IDENTITY = {
  name: "Farah Khan",
  title: "S8UL Esports",
  subtitle: "BGMI Pro",
  tagline: "Content Creator",
  bio: "Creator bio",
};

function identityPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: IDENTITY.name,
    title: IDENTITY.title,
    subtitle: IDENTITY.subtitle,
    tagline: IDENTITY.tagline,
    bio: IDENTITY.bio,
    profilePictureUrl: "https://cdn.test/farah.jpg",
    profilePictureAssetId: "asset-1",
    ...overrides,
  };
}

class NoopIO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
class NoopRO {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  h.mockGetServerSession.mockResolvedValue({
    user: { id: "u1", role: "SUPER_ADMIN", tenantId: "t1" },
  });
  h.mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb({}));
  h.mockPatchHeroData.mockResolvedValue(undefined);
  h.mockGetHeroData.mockResolvedValue({ ...IDENTITY, profilePictureUrl: "" });
  h.mockLogAction.mockResolvedValue(undefined);
  h.mockAfterContentChange.mockResolvedValue(undefined);
  h.mockAssertHeroVideoAsset.mockResolvedValue(undefined);
  h.mockCaptureError.mockReturnValue({ message: "x" });
  (globalThis as Record<string, unknown>).IntersectionObserver = NoopIO;
  (globalThis as Record<string, unknown>).ResizeObserver = NoopRO;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (q: string) => ({
      matches: false, media: q, addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    }),
  });
});

describe("RCCF-72.12 — save Hero with profile picture", () => {
  it("persists the existing profile picture URL alongside the identity fields", async () => {
    const res = await updateHeroPartial("t1", identityPayload());

    expect(res).toEqual({ success: true });
    expect(h.mockPatchHeroData).toHaveBeenCalledTimes(1);
    const [, payload] = h.mockPatchHeroData.mock.calls[0];
    expect(payload.profilePictureUrl).toBe("https://cdn.test/farah.jpg");
    expect(payload.profilePictureAssetId).toBe("asset-1");
    expect(payload.title).toBe(IDENTITY.title);
  });

  it("logs the sparse write through the audit pipeline", async () => {
    await updateHeroPartial("t1", identityPayload());

    expect(h.mockLogAction).toHaveBeenCalledWith("t1", "updateHeroPartial", { fields: expect.any(Array) }, {});
    expect(h.mockAfterContentChange).toHaveBeenCalledWith("t1");
  });
});

describe("RCCF-72.12 — save Hero WITHOUT profile picture (72.1-F1)", () => {
  it("accepts an explicit null picture (absent profile) and succeeds", async () => {
    const res = await updateHeroPartial(
      "t1",
      identityPayload({ profilePictureUrl: null, profilePictureAssetId: null }),
    );

    expect(res.success).toBe(true);
    const [, payload] = h.mockPatchHeroData.mock.calls[0];
    expect(payload.profilePictureUrl).toBeNull();
    expect(payload.profilePictureAssetId).toBeNull();
  });

  it("persists title changes when no profile picture exists", async () => {
    const res = await updateHeroPartial(
      "t1",
      identityPayload({ title: "New Headline", profilePictureUrl: null, profilePictureAssetId: null }),
    );

    expect(res.success).toBe(true);
    const [, payload] = h.mockPatchHeroData.mock.calls[0];
    expect(payload.title).toBe("New Headline");
    expect(payload.profilePictureUrl).toBeNull();
  });

  it("persists subtitle changes when no profile picture exists", async () => {
    const res = await updateHeroPartial(
      "t1",
      identityPayload({ subtitle: "New Subtitle", profilePictureUrl: null, profilePictureAssetId: null }),
    );

    expect(res.success).toBe(true);
    const [, payload] = h.mockPatchHeroData.mock.calls[0];
    expect(payload.subtitle).toBe("New Subtitle");
    expect(payload.profilePictureUrl).toBeNull();
  });
});

describe("RCCF-72.12 — clear existing profile picture", () => {
  it("persists the cleared state as JSON null (key removed by the DB merge)", async () => {
    const res = await updateHeroPartial(
      "t1",
      identityPayload({ profilePictureUrl: null, profilePictureAssetId: null }),
    );

    expect(res.success).toBe(true);
    const [, payload] = h.mockPatchHeroData.mock.calls[0];
    expect(payload.profilePictureUrl).toBeNull();
    expect(payload.profilePictureAssetId).toBeNull();
  });

  it("background clear (null URL) is accepted and persisted", async () => {
    const res = await updateHeroPartial("t1", {
      backgroundUrl: null,
      backgroundAssetId: null,
    });

    expect(res.success).toBe(true);
    const [, payload] = h.mockPatchHeroData.mock.calls[0];
    expect(payload.backgroundUrl).toBeNull();
    expect(payload.backgroundAssetId).toBeNull();
  });

  it("empty strings normalize to the same JSON null clear at the action boundary", async () => {
    const res = await updateHeroPartial(
      "t1",
      identityPayload({ profilePictureUrl: "", profilePictureAssetId: "" }),
    );

    expect(res.success).toBe(true);
    const [, payload] = h.mockPatchHeroData.mock.calls[0];
    expect(payload.profilePictureUrl).toBeNull();
    expect(payload.profilePictureAssetId).toBeNull();
  });
});

describe("RCCF-72.12 — unrelated fields are preserved (sparse patch)", () => {
  it("identity save sends ONLY identity keys — never wipes socialLinks/CTA/liveBadge", async () => {
    await updateHeroPartial(
      "t1",
      identityPayload({ profilePictureUrl: null, profilePictureAssetId: null }),
    );

    const [, payload] = h.mockPatchHeroData.mock.calls[0];
    const keys = Object.keys(payload).sort();
    expect(keys).toEqual([
      "bio", "name", "profilePictureAssetId", "profilePictureUrl",
      "subtitle", "tagline", "title",
    ]);
    expect(payload.socialLinks).toBeUndefined();
    expect(payload.ctaText).toBeUndefined();
    expect(payload.ctaLink).toBeUndefined();
    expect(payload.liveBadgeText).toBeUndefined();
    expect(payload.showLiveBadge).toBeUndefined();
    expect(payload.videoUrl).toBeUndefined();
    expect(payload.backgroundUrl).toBeUndefined();
  });

  it("a true empty partial returns success without touching the DB", async () => {
    const res = await updateHeroPartial("t1", {});

    expect(res).toEqual({ success: true });
    expect(h.mockPatchHeroData).not.toHaveBeenCalled();
  });
});

describe("RCCF-72.12 — omitted / undefined profile picture never touches the key", () => {
  it("profilePictureUrl OMITTED → leave unchanged (key never sent to the merge)", async () => {
    const { profilePictureUrl: _url, profilePictureAssetId: _assetId, ...payload } = identityPayload();

    const res = await updateHeroPartial("t1", payload);

    expect(res.success).toBe(true);
    const [, patch] = h.mockPatchHeroData.mock.calls[0];
    expect(patch).not.toHaveProperty("profilePictureUrl");
    expect(patch).not.toHaveProperty("profilePictureAssetId");
    expect(patch.name).toBe(IDENTITY.name);
    expect(patch.title).toBe(IDENTITY.title);
  });

  it("profilePictureUrl UNDEFINED → leave unchanged (sparse loop skips undefined)", async () => {
    const res = await updateHeroPartial("t1", identityPayload({ profilePictureUrl: undefined, profilePictureAssetId: undefined }));

    expect(res.success).toBe(true);
    const [, patch] = h.mockPatchHeroData.mock.calls[0];
    expect(patch).not.toHaveProperty("profilePictureUrl");
    expect(patch).not.toHaveProperty("profilePictureAssetId");
    expect(patch.name).toBe(IDENTITY.name);
  });
});

describe("RCCF-72.12 — invalid profile picture is rejected server-side", () => {
  it("a non-string, non-null profilePictureUrl returns a structured validation error", async () => {
    const res = await updateHeroPartial("t1", identityPayload({ profilePictureUrl: 12345 }));

    expect(res.success).toBe(false);
    expect(res.error).toBe("Unable to save your hero settings. Please review your changes and try again.");
    expect(res.fieldErrors?.profilePictureUrl).toBeTruthy();
    expect(h.mockPatchHeroData).not.toHaveBeenCalled();
  });
});

describe("RCCF-72.12 — tenant boundary (wrong user cannot modify identity)", () => {
  it("an authenticated user of ANOTHER tenant gets Forbidden and no write happens", async () => {
    h.mockGetServerSession.mockResolvedValue({
      user: { id: "u2", role: "CREATOR", tenantId: "t2" },
    });

    const res = await updateHeroPartial("t1", identityPayload());

    expect(res.success).toBe(false);
    expect(res.error).toBe("Forbidden");
    expect(h.mockPatchHeroData).not.toHaveBeenCalled();
    expect(h.mockLogAction).not.toHaveBeenCalled();
  });

  it("a SUPER_ADMIN acting for the tenant still succeeds (existing auth contract)", async () => {
    const res = await updateHeroPartial("t1", identityPayload());

    expect(res.success).toBe(true);
    expect(h.mockPatchHeroData).toHaveBeenCalledTimes(1);
  });
});

describe("RCCF-72.12 — structured, user-readable errors (F9)", () => {
  it("an invalid payload returns a friendly message + fieldErrors, not 'Invalid hero data'", async () => {
    const res = await updateHeroPartial("t1", { videoDesktopAlignment: "bogus" });

    expect(res.success).toBe(false);
    expect(res.error).toBe("Unable to save your hero settings. Please review your changes and try again.");
    expect(res.fieldErrors?.videoDesktopAlignment).toBeTruthy();
    expect(res.error).not.toContain("Invalid");
    expect(res.error).not.toContain("enum");
    expect(h.mockPatchHeroData).not.toHaveBeenCalled();
  });

  it("a raw database error collapses to a safe generic message (no Prisma/DB internals)", async () => {
    h.mockPatchHeroData.mockRejectedValue(
      new Error("PrismaClientKnownRequestError: Unique constraint failed on fields (`key`)"),
    );

    const res = await updateHeroPartial("t1", identityPayload());

    expect(res.success).toBe(false);
    expect(res.error).toBe("Unable to save your hero settings. Please try again.");
    expect(res.error.toLowerCase()).not.toContain("prisma");
    expect(res.error.toLowerCase()).not.toContain("constraint");
    expect(h.mockCaptureError).toHaveBeenCalled();
  });

  it("known product-readable errors pass through verbatim", async () => {
    const res = await updateHeroPartial("t1", { videoUrl: "https://raw.example/v.mp4" });

    expect(res.success).toBe(false);
    expect(res.error).toBe("Hero video must reference an uploaded asset.");
  });

  it("auth failure returns the structured Unauthorized error", async () => {
    h.mockGetServerSession.mockResolvedValue(null);

    const res = await updateHeroPartial("t1", identityPayload());

    expect(res.success).toBe(false);
    expect(res.error).toBe("Unauthorized");
    expect(h.mockPatchHeroData).not.toHaveBeenCalled();
  });
});

describe("RCCF-72.12 — FormData path (updateHeroData)", () => {
  it("media save with empty (cleared) fields succeeds", async () => {
    const fd = new FormData();
    fd.set("videoUrl", "");
    fd.set("videoAssetId", "");
    fd.set("posterUrl", "");
    fd.set("posterAssetId", "");
    fd.set("videoDesktopAlignment", "center");
    fd.set("videoMobileAlignment", "center");
    fd.set("imageDesktopAlignment", "center");
    fd.set("imageMobileAlignment", "center");

    const res = await updateHeroData("t1", { success: false }, fd);

    expect(res.success).toBe(true);
    const [, payload] = h.mockPatchHeroData.mock.calls[0];
    expect(payload.videoUrl).toBeNull();
    expect(payload.posterUrl).toBeNull();
  });

  it("invalid FormData payload returns structured errors", async () => {
    const fd = new FormData();
    fd.set("videoDesktopAlignment", "left-of-center");

    const res = await updateHeroData("t1", { success: false }, fd);

    expect(res.success).toBe(false);
    expect(res.error).toBe("Unable to save your hero settings. Please review your changes and try again.");
    expect(res.fieldErrors?.videoDesktopAlignment).toBeTruthy();
  });
});

describe("RCCF-72.12 — existing Hero renderer receives persisted data", () => {
  it("renders the avatar when profilePictureUrl is persisted", () => {
    const { container } = render(
      <HeroRenderer
        props={{
          title: "S8UL Esports",
          name: "Farah Khan",
          profilePictureUrl: "https://cdn.test/farah.jpg",
          resolvedMedia: "placeholder",
          mediaUrl: "",
          mediaPoster: "",
        }}
      />,
    );
    expect(container.querySelector("img[alt='Farah Khan']")).toBeTruthy();
  });

  it("renders NO avatar when profilePictureUrl is empty/null (cleared)", () => {
    const { container } = render(
      <HeroRenderer
        props={{
          title: "S8UL Esports",
          name: "Farah Khan",
          profilePictureUrl: "",
          resolvedMedia: "placeholder",
          mediaUrl: "",
          mediaPoster: "",
        }}
      />,
    );
    expect(container.querySelector("img[alt='Farah Khan']")).toBeNull();
    expect(container.textContent).toContain("S8UL Esports");
  });
});

describe("RCCF-72.12 — source-level guardrails", () => {
  const actionsSrc = readFileSync("src/actions/settings.actions.ts", "utf8");
  const formSrc = readFileSync("src/features/settings/components/settings-form.tsx", "utf8");
  const serviceSrc = readFileSync("src/services/settings.service.ts", "utf8");

  it("hero schema accepts null on every string field (null = clear)", () => {
    expect(actionsSrc).toMatch(/z\.string\(\)\.nullable\(\)\.optional\(\)/);
  });

  it("the terse 'Invalid hero data' error return is gone", () => {
    expect(actionsSrc).not.toMatch(/error:\s*"Invalid hero data"/);
  });

  it("the sparse loop passes null through and only skips omitted fields", () => {
    expect(actionsSrc).toContain("if (value === undefined) continue;");
    expect(actionsSrc).not.toMatch(/if \(value !== undefined && value !== null\) \{/);
  });

  it("the form still expresses 'clear' as explicit null for profile picture", () => {
    expect(formSrc).toMatch(/profilePictureUrl:\s*\(overrides\?\.profilePictureUrl \?\? profilePictureUrl\) \|\| null/);
  });

  it("the form surfaces background save errors (background clear path of 72.1-F1)", () => {
    expect(formSrc).toContain("setBackgroundSave");
    expect(formSrc).toContain("backgroundSave.state.error");
  });

  it("hero ownership stays in Settings/hero_data — the JSONB null delete-key contract is intact", () => {
    expect(serviceSrc).toContain("kv.\"v\" = 'null'::jsonb");
    expect(serviceSrc).toContain("'hero_data'");
    expect(actionsSrc).toContain("SettingsService.patchHeroData");
  });
});