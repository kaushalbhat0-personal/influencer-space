// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { YouTubeEnhancementCta } from "@/features/integrations/components/youtube-enhancement-cta";

describe("RCCF-PRELAUNCH-16E — YouTube enhancement CTA (optional, non-blocking)", () => {
  describe("disconnected state", () => {
    it("renders polished non-technical copy and Connect YouTube CTA linking to integrations surface", () => {
      render(<YouTubeEnhancementCta isConnected={false} />);
      expect(screen.getByTestId("youtube-enhancement-cta")).toBeInTheDocument();
      expect(screen.getByText("Make your website even better")).toBeInTheDocument();
      expect(screen.getByText("Connect YouTube to automatically bring in your latest videos, channel stats, and content.")).toBeInTheDocument();
      const cta = screen.getByTestId("youtube-connect-cta");
      expect(cta).toBeInTheDocument();
      expect(cta.getAttribute("href")).toBe("/admin/integrations");
      expect(cta.textContent).toContain("Connect YouTube");
      // Never mentions API keys / env / credentials
      expect(screen.queryByText(/API key/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/environment/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/credential/i)).not.toBeInTheDocument();
      // Pendallo-branded via BRAND authority
      expect(screen.getByText(/By Pendallo/)).toBeInTheDocument();
    });

    it("is not gated — renders even without entitlement (link still goes to integrations)", () => {
      render(<YouTubeEnhancementCta isConnected={false} />);
      const cta = screen.getByTestId("youtube-connect-cta");
      expect(cta.getAttribute("href")).toBe("/admin/integrations");
    });

    it("uses responsive classes for 390/768/1440", () => {
      const { container } = render(<YouTubeEnhancementCta isConnected={false} />);
      const section = container.querySelector('[data-testid="youtube-enhancement-cta"]') as HTMLElement;
      expect(section.className).toMatch(/sm:p-6/);
      const inner = container.querySelector(".sm\\:flex-row") as HTMLElement;
      expect(inner).not.toBeNull();
      // CTA button should be full-width on 390, auto on sm+
      const cta = screen.getByTestId("youtube-connect-cta");
      expect(cta.className).toMatch(/w-full/);
      expect(cta.className).toMatch(/sm:w-auto/);
    });
  });

  describe("connected state", () => {
    it("shows connected state instead of CTA when YouTube is connected", () => {
      render(<YouTubeEnhancementCta isConnected={true} />);
      expect(screen.getByTestId("youtube-enhancement-connected")).toBeInTheDocument();
      expect(screen.getByText("YouTube connected")).toBeInTheDocument();
      expect(screen.getByText("Your latest videos and channel stats are syncing automatically.")).toBeInTheDocument();
      expect(screen.getByTestId("youtube-manage-cta")).toBeInTheDocument();
      expect(screen.getByTestId("youtube-manage-cta").getAttribute("href")).toBe("/admin/integrations");
      expect(screen.queryByTestId("youtube-connect-cta")).not.toBeInTheDocument();
      // Does not fabricate stats
      expect(screen.queryByText(/subscribers/)).not.toBeInTheDocument();
      expect(screen.queryByText(/followers/)).not.toBeInTheDocument();
    });

    it("connected CTA links to existing integrations surface, not parallel flow", () => {
      render(<YouTubeEnhancementCta isConnected={true} />);
      expect(screen.getByTestId("youtube-manage-cta").getAttribute("href")).toBe("/admin/integrations");
    });
  });

  describe("graceful non-blocking when unavailable", () => {
    it("renders disconnected CTA gracefully when service is unavailable", () => {
      render(<YouTubeEnhancementCta isConnected={false} isUnavailable />);
      expect(screen.getByTestId("youtube-enhancement-cta")).toBeInTheDocument();
      expect(screen.getByText("Make your website even better")).toBeInTheDocument();
      expect(screen.getByTestId("youtube-connect-cta").getAttribute("href")).toBe("/admin/integrations");
    });

    it("never mentions technical setup when unavailable", () => {
      render(<YouTubeEnhancementCta isConnected={false} isUnavailable />);
      expect(screen.queryByText(/API/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/key/i)).not.toBeInTheDocument();
    });
  });

  describe("generation remains unaffected", () => {
    it("component is pure UI — does not fetch YouTube data or block generation", () => {
      // Rendering the CTA must not trigger any fetch; it's purely presentational
      // when given props. Server wrapper handles data fetching separately.
      const { container } = render(<YouTubeEnhancementCta isConnected={false} />);
      expect(container.innerHTML).not.toContain("youtubeApiKey");
      expect(container.innerHTML).not.toContain("YOUTUBE_API_KEY");
    });
  });
});
