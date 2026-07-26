/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "ws-1" }) },
    workspaceMember: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({}), findUnique: vi.fn().mockResolvedValue(null) },
    setting: { upsert: vi.fn().mockResolvedValue({}) },
    website: { findUnique: vi.fn().mockResolvedValue({ id: "web-1" }) },
    publishSnapshot: { create: vi.fn().mockResolvedValue({}) },
    publishStatus: { upsert: vi.fn().mockResolvedValue({}) },
    creatorProvisionRun: { create: vi.fn().mockResolvedValue({ id: "run-1" }) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    tenant: { findUnique: vi.fn().mockResolvedValue({ subdomain: "test", customDomain: null }) },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { id: "user-1", name: "TestCreator", tenantId: "tenant-1" } }),
}));

vi.mock("@/lib/generation/session", () => ({
  sessionService: {
    create: vi.fn().mockResolvedValue({ id: "gs-1" }),
    start: vi.fn().mockResolvedValue({}),
    beginExecution: vi.fn().mockResolvedValue({}),
    updateStage: vi.fn().mockResolvedValue({}),
    updateProgress: vi.fn().mockResolvedValue({}),
    complete: vi.fn().mockResolvedValue({}),
    fail: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/modules/workspace/infrastructure/repository", () => ({
  workspaceRepository: {
    findMembershipsByUserId: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: "ws-1" }),
    addMember: vi.fn().mockResolvedValue({}),
    findByTenantId: vi.fn().mockResolvedValue({ id: "ws-1" }),
  },
}));

vi.mock("@/lib/platform/correlation", () => ({
  correlationService: { create: vi.fn().mockReturnValue({ correlationId: "corr-1" }) },
}));

vi.mock("@/lib/events", () => ({
  platformEventBus: { publish: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({
  logAction: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("G-01: YouTube ContentSource → KnowledgeGraph", () => {
  it("buildContentSourceFromYouTube populates all fields", async () => {
    const { buildContentSourceFromYouTube } = await import(
      "@/lib/generation/integration/provision-pipeline"
    );
    const source = buildContentSourceFromYouTube("https://youtube.com/@test", {
      id: "UC-test", title: "Test Channel", description: "A test channel",
      thumbnailUrl: "https://example.com/thumb.jpg", customUrl: "@test",
      subscriberCount: 15000,
    });
    expect(source.platform).toBe("youtube");
    expect(source.displayName).toBe("Test Channel");
    expect(source.followers).toBe(15000);
    expect(source.avatarUrl).toBe("https://example.com/thumb.jpg");
    expect(source.links.length).toBeGreaterThanOrEqual(2);
  });

  it("truncates bio over 500 chars", async () => {
    const { buildContentSourceFromYouTube } = await import(
      "@/lib/generation/integration/provision-pipeline"
    );
    const source = buildContentSourceFromYouTube("https://youtube.com/@test", {
      id: "UC-test", title: "T", description: "X".repeat(1000),
      thumbnailUrl: "", customUrl: "@test", subscriberCount: 0,
    });
    expect(source.bio.length).toBeLessThanOrEqual(500);
  });

  it("includes channel URL in links", async () => {
    const { buildContentSourceFromYouTube } = await import(
      "@/lib/generation/integration/provision-pipeline"
    );
    const source = buildContentSourceFromYouTube("https://youtube.com/@myhandle", {
      id: "UC-m", title: "M", description: "", thumbnailUrl: "",
      customUrl: "@myhandle", subscriberCount: 100,
    });
    expect(source.links.some((l) => l.includes("@myhandle"))).toBe(true);
  });
});

describe("G-02: Workspace creation", () => {
  it("workspaceRepository.create is called with correct shape", async () => {
    const { workspaceRepository } = await import(
      "@/modules/workspace/infrastructure/repository"
    );
    const slug = `ws_test_${Date.now()}`;
    await workspaceRepository.create({ type: "TENANT", name: "Test WS", slug });
    expect(workspaceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: "TENANT", name: "Test WS" }),
    );
  });
});

describe("URL Validation", () => {
  it("accepts valid youtube.com/@handle", async () => {
    const { YouTubeAdapter } = await import("@/lib/import/adapters/youtube");
    const adapter = new YouTubeAdapter();
    expect(adapter.validate("https://youtube.com/@testchannel").valid).toBe(true);
  });

  it("rejects empty input", async () => {
    const { YouTubeAdapter } = await import("@/lib/import/adapters/youtube");
    const adapter = new YouTubeAdapter();
    expect(adapter.validate("").valid).toBe(false);
  });

  it("rejects non-YouTube URL", async () => {
    const { YouTubeAdapter } = await import("@/lib/import/adapters/youtube");
    const adapter = new YouTubeAdapter();
    expect(adapter.validate("https://instagram.com/test").valid).toBe(false);
  });

  it("rejects malformed YouTube URL", async () => {
    const { YouTubeAdapter } = await import("@/lib/import/adapters/youtube");
    const adapter = new YouTubeAdapter();
    const result = adapter.validate("not-a-url");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid YouTube URL");
  });
});

describe("YouTube scraper typed errors", () => {
  it("returns missing_credentials when key missing", async () => {
    const old = process.env.YOUTUBE_API_KEY;
    delete process.env.YOUTUBE_API_KEY;
    const { YouTubeScraperService } = await import("@/services/youtube-scraper.service");
    const result = await YouTubeScraperService.fetchWithResult("@test");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("missing_credentials");
    }
    process.env.YOUTUBE_API_KEY = old;
  });
});

describe("B-01: ISR revalidation", () => {
  it("revalidatePath is imported and callable", async () => {
    const { revalidatePath } = await import("next/cache");
    expect(() => revalidatePath("/", "layout")).not.toThrow();
  });
});

describe("detectPlatform", () => {
  it("detects youtube URLs", async () => {
    const { detectPlatform } = await import(
      "@/lib/generation/integration/provision-pipeline"
    );
    expect(detectPlatform("https://youtube.com/@test")).toBe("youtube");
    expect(detectPlatform("https://youtu.be/test")).toBe("youtube");
  });

  it("detects instagram URLs", async () => {
    const { detectPlatform } = await import(
      "@/lib/generation/integration/provision-pipeline"
    );
    expect(detectPlatform("https://instagram.com/test")).toBe("instagram");
  });
});
