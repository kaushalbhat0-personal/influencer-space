/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import {
  generateShareUrl, generateOpenGraphImageUrl, generateQrCodeDataUrl,
  getSocialShareLinks, copyToClipboard,
} from "../sharing";

describe("generateShareUrl", () => {
  it("generates home url", () => {
    expect(generateShareUrl("example.com", "home")).toBe("https://example.com");
  });

  it("generates page url", () => {
    expect(generateShareUrl("example.com", "about")).toBe("https://example.com/about");
  });
});

describe("generateOpenGraphImageUrl", () => {
  it("generates URL with title", () => {
    const url = generateOpenGraphImageUrl("My Store", "Tagline");
    expect(url).toContain("/api/og?title=My+Store&tagline=Tagline");
  });

  it("includes avatar when provided", () => {
    const url = generateOpenGraphImageUrl("Store", undefined, "https://example.com/avatar.jpg");
    expect(url).toContain("avatar=");
  });
});

describe("generateQrCodeDataUrl", () => {
  it("generates QR API URL", () => {
    const url = generateQrCodeDataUrl("https://example.com");
    expect(url).toContain("api.qrserver.com");
    expect(url).toContain(encodeURIComponent("https://example.com"));
  });
});

describe("getSocialShareLinks", () => {
  it("generates all share links", () => {
    const links = getSocialShareLinks("https://example.com", "Check this out");
    expect(links.twitter).toContain("twitter.com/intent/tweet");
    expect(links.facebook).toContain("facebook.com/sharer");
    expect(links.whatsapp).toContain("wa.me");
    expect(links.telegram).toContain("t.me/share");
    expect(links.email).toContain("mailto:");
  });

  it("encodes URL and title", () => {
    const links = getSocialShareLinks("https://example.com", "Cool Store");
    expect(links.twitter).toContain(encodeURIComponent("Cool Store"));
  });
});

describe("copyToClipboard", () => {
  it("returns false in non-browser environment", async () => {
    const result = await copyToClipboard("text");
    expect(result).toBe(false);
  });
});
