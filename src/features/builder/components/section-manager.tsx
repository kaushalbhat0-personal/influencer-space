"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { builderStore } from "@/lib/builder/store";
import { builderEditor } from "@/lib/builder/commands/editor";
import { builderEvents } from "@/lib/builder/events";
import { componentRegistry } from "@/lib/registry/components";
import { sectionCountResolver } from "@/lib/builder/section-counts";
import type { WebsiteAggregate } from "@/types/snapshot";
import type { ComponentCategory } from "@/lib/registry/components/types";
import { cn } from "@/lib/utils";
import {
  Eye, EyeOff, ExternalLink, Trash2, Copy, ArrowUp, ArrowDown,
  ShoppingBag, Image, HelpCircle, Trophy, Gamepad2, Rss,
  Link2, MessageSquare, Mail, CreditCard, BookOpen, Music,
  MessageCircle, Sparkles, Layout, Briefcase,
} from "lucide-react";

const SECTION_ICONS: Record<string, typeof ShoppingBag> = {
  hero: Sparkles, products: ShoppingBag, gallery: Image,
  testimonials: MessageSquare, faq: HelpCircle, timeline: Trophy,
  games: Gamepad2, contentfeed: Rss, links: Link2, footer: Layout,
  contact: Mail, newsletter: Rss, pricing: CreditCard, courses: BookOpen,
  services: Briefcase, embed: Music, social: MessageCircle,
};

function getIcon(sectionName: string) {
  const key = sectionName.toLowerCase();
  return SECTION_ICONS[key] ?? Layout;
}

const EDIT_LINKS: Record<string, string> = {
  "hero.default": "/admin/settings", "hero.gaming": "/admin/settings",
  "hero.fitness": "/admin/settings", "hero.education": "/admin/settings",
  "hero.split": "/admin/settings",
  "products.grid": "/admin/products",
  "gallery.grid": "/admin/gallery", "gallery.bento": "/admin/gallery",
  "testimonials.default": "/admin/testimonials", "testimonials.marquee": "/admin/testimonials",
  "faq.default": "/admin/faq", "timeline.default": "/admin/milestones",
  "games.default": "/admin/games", "links.default": "/admin/links",
  "contentFeed.default": "/admin/settings/content",
  "courses.default": "/admin/courses",
  "services.default": "/admin/services", "services.bento": "/admin/services",
  "footer.default": "/admin/footer",
};

const CONTENT_LABELS: Record<string, string> = {
  products: "Products", gallery: "Images", testimonials: "Testimonials",
  faq: "Items", timeline: "Events", games: "Games", links: "Links",
  hero: "Hero", footer: "Footer", contact: "Contact",
  newsletter: "Subscribers", pricing: "Plans", courses: "Courses",
  services: "Services", embed: "Embeds", social: "Links", contentfeed: "Posts",
};

/**
 * The sidebar catalog. Each entry maps to a REGISTERED component id, so every
 * "Add Section" click produces a section + default slot + registered component
 * that the canvas renders immediately. The catalog is validated against the
 * ComponentRegistry at module load — any entry whose component is not
 * registered is dropped, so the sidebar and canvas can never diverge.
 */
const SECTION_CATALOG: { name: string; category: ComponentCategory; componentId: string }[] = [
  { name: "Hero", category: "hero", componentId: "hero.default" },
  { name: "Hero Split", category: "hero", componentId: "hero.split" },
  { name: "Products", category: "products", componentId: "products.grid" },
  { name: "Gallery", category: "gallery", componentId: "gallery.grid" },
  { name: "Gallery Bento", category: "gallery", componentId: "gallery.bento" },
  { name: "Timeline", category: "timeline", componentId: "timeline.default" },
  { name: "Testimonials", category: "testimonials", componentId: "testimonials.default" },
  { name: "Testimonials Marquee", category: "testimonials", componentId: "testimonials.marquee" },
  { name: "FAQ", category: "faq", componentId: "faq.default" },
  { name: "Courses", category: "courses", componentId: "courses.default" },
  { name: "Services", category: "services", componentId: "services.default" },
  { name: "Services Bento", category: "services", componentId: "services.bento" },
  { name: "Games", category: "games", componentId: "games.default" },
  { name: "ContentFeed", category: "contentFeed", componentId: "contentFeed.default" },
  { name: "Newsletter", category: "newsletter", componentId: "newsletter.default" },
  { name: "Contact", category: "contact", componentId: "contact.default" },
  { name: "Footer", category: "footer", componentId: "footer.default" },
];

const DEFAULT_SECTIONS = SECTION_CATALOG.filter((e) => componentRegistry.get(e.componentId) !== undefined);

interface SectionData {
  id: string;
  name: string;
  visible: boolean;
  /** Canonical CMS item count from the Website Aggregate (null = static/unknown). */
  itemCount: number | null;
  /** True when the section has unpublished presentation overrides (draft dot). */
  hasDraft: boolean;
  moduleIds: string[];
}

function SectionCard({
  section, index, total, isSelected, onSelect,
  onMoveUp, onMoveDown, onToggleVisibility, onDuplicate, onDelete,
}: {
  section: SectionData;
  index: number;
  total: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = getIcon(section.name);
  const moduleId = section.moduleIds[0] ?? "";
  const editHref = moduleId ? EDIT_LINKS[moduleId] : null;
  const contentLabel = CONTENT_LABELS[section.name.toLowerCase()] ?? "Items";
  const tid = section.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
      <div
        role="listitem"
        onClick={() => onSelect(section.id)}
        data-testid={`builder-section-${tid}`}
        className={cn(
          "group flex items-center gap-1.5 rounded-lg px-2 py-2 cursor-pointer transition-colors",
          isSelected
            ? "bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/30"
            : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200"
        )}
      >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(section.id);
            }}
            aria-pressed={isSelected}
            aria-label={`Select ${section.name} section`}
            data-testid={`builder-section-select-${tid}`}
            className="text-left text-[11px] font-medium truncate rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0"
          >
            {section.name}
          </button>
          {/* RCCF-IMPLEMENTATION-74: canonical item count (aggregate-driven).
              Only repeatable sections with count > 0 show a badge — never "(0)",
              never a static section, never block/slot count. */}
          {section.itemCount != null && section.itemCount > 0 && (
            <span className="text-[9px] text-zinc-500 shrink-0">
              {section.itemCount} {contentLabel.toLowerCase()}
            </span>
          )}
          {/* Draft dot: the section has presentation overrides in the draft
              (custom title/description/visibility/hide-when-empty) that are not
              yet published. Subtle, derived from existing builder data. */}
          {section.hasDraft && (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/80"
              title="Has unpublished presentation changes"
              aria-label="Has unpublished presentation changes"
            />
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn(
            "flex items-center gap-0.5 text-[9px]",
            section.visible ? "text-emerald-400/80" : "text-zinc-600"
          )}>
            {section.visible ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
            {section.visible ? "Visible" : "Hidden"}
          </span>
        </div>
      </div>

      {/* Actions are always visible below lg (touch has no hover) and revealed
           on hover/focus on desktop — never hover-only. */}
      <div className="flex items-center gap-0.5 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(section.id); }}
          data-testid={`section-${tid}-up`}
          aria-label={`Move ${section.name} up`}
          disabled={index === 0}
          className="flex items-center justify-center rounded min-h-[44px] min-w-[44px] p-2 text-zinc-500 hover:bg-white/10 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-20 lg:min-h-[28px] lg:min-w-[28px] lg:p-1">
          <ArrowUp className="h-3 w-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(section.id); }}
          data-testid={`section-${tid}-down`}
          aria-label={`Move ${section.name} down`}
          disabled={index === total - 1}
          className="flex items-center justify-center rounded min-h-[44px] min-w-[44px] p-2 text-zinc-500 hover:bg-white/10 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-20 lg:min-h-[28px] lg:min-w-[28px] lg:p-1">
          <ArrowDown className="h-3 w-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(section.id); }}
          data-testid={`section-${tid}-toggle`}
          aria-label={section.visible ? `Hide ${section.name}` : `Show ${section.name}`}
          className="flex items-center justify-center rounded min-h-[44px] min-w-[44px] p-2 text-zinc-500 hover:bg-white/10 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:min-h-[28px] lg:min-w-[28px] lg:p-1">
          {section.visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>
        {editHref && (
          <Link href={editHref} className="flex items-center justify-center rounded min-h-[44px] min-w-[44px] p-2 text-zinc-500 hover:bg-white/10 hover:text-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:min-h-[28px] lg:min-w-[28px] lg:p-1"
            onClick={(e) => e.stopPropagation()}>
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(section.id); }}
          data-testid={`section-${tid}-duplicate`}
          aria-label={`Duplicate ${section.name}`}
          className="flex items-center justify-center rounded min-h-[44px] min-w-[44px] p-2 text-zinc-500 hover:bg-white/10 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:min-h-[28px] lg:min-w-[28px] lg:p-1">
          <Copy className="h-3 w-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${section.name}"?`)) onDelete(section.id); }}
          data-testid={`section-${tid}-delete`}
          aria-label={`Delete ${section.name}`}
          className="flex items-center justify-center rounded min-h-[44px] min-w-[44px] p-2 text-zinc-500 hover:bg-red-500/20 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 lg:min-h-[28px] lg:min-w-[28px] lg:p-1">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function SectionManager({
  className,
  aggregate,
}: {
  className?: string;
  /** RCCF-IMPLEMENTATION-74: the Website Aggregate already loaded by the Builder
   * canvas (getLivePreviewData). Zero extra queries — counts derive from it. */
  aggregate?: WebsiteAggregate | null;
}) {
  const [sections, setSections] = useState<SectionData[]>([]);

  const refresh = useCallback(() => {
    const canvas = builderStore.canvas;
    const page = canvas.pages.find((p) => p.id === canvas.activePageId);
    setSections(
      page?.sections?.map((s) => {
        const moduleIds = s.slots.map((sl) => sl.moduleId);
        const hasDraft = s.slots.some((sl) => {
          const presentation = (sl.config as Record<string, unknown>)?.presentation as Record<string, unknown> | undefined;
          return !!presentation && Object.keys(presentation).length > 0;
        });
        return {
          id: s.id,
          name: s.name,
          visible: s.visible,
          itemCount: sectionCountResolver.countForModule(moduleIds[0] ?? "", aggregate),
          moduleIds,
          hasDraft,
        };
      }) ?? []
    );
  }, [aggregate]);

  useEffect(() => {
    refresh();
    // Reactive, not polled: every store mutation re-syncs the sidebar. The
    // canvas and sidebar read the same store, so they can never diverge. When
    // the shared aggregate updates (focus refetch), `refresh` re-runs and the
    // canonical counts update automatically.
    return builderEvents.subscribe("store:changed", () => refresh());
  }, [refresh]);

  const addSection = useCallback((entry: { name: string; category: ComponentCategory; componentId: string }) => {
    const definition = componentRegistry.get(entry.componentId);
    if (!definition) return;
    const sec = builderStore.addSection(entry.name);
    builderStore.insertComponent(entry.componentId, sec.id, 0);
    setTimeout(refresh, 50);
  }, [refresh]);

  const removeSection = useCallback((id: string) => {
    builderEditor.deleteSection(id);
    setTimeout(refresh, 50);
  }, [refresh]);

  const moveSection = useCallback((id: string, direction: "up" | "down") => {
    const canvas = builderStore.canvas;
    const page = canvas.pages.find((p) => p.id === canvas.activePageId);
    if (!page) return;
    const idx = page.sections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const newIdx = direction === "up" ? Math.max(0, idx - 1) : Math.min(page.sections.length - 1, idx + 1);
    if (newIdx === idx) return;
    builderStore.reorderSections(page.id, idx, newIdx);
    setTimeout(refresh, 50);
  }, [refresh]);

  const toggleVisibility = useCallback((id: string) => {
    const canvas = builderStore.canvas;
    const page = canvas.pages.find((p) => p.id === canvas.activePageId);
    if (!page) return;
    const section = page.sections.find((s) => s.id === id);
    if (section) {
      builderStore.setSectionVisibility(page.id, id, !section.visible);
      setTimeout(refresh, 50);
    }
  }, [refresh]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {sections.length > 0 ? (
        <div className="flex-1 overflow-y-auto space-y-0.5 p-1.5" role="list" aria-label="Sections">
          {sections.map((section, index) => (
            <SectionCard
              key={section.id}
              section={section}
              index={index}
              total={sections.length}
              isSelected={builderStore.isSelected(section.id)}
              onSelect={(id) => builderStore.select(id)}
              onMoveUp={(id) => moveSection(id, "up")}
              onMoveDown={(id) => moveSection(id, "down")}
              onToggleVisibility={toggleVisibility}
              onDuplicate={(id) => { builderEditor.duplicateSection(id); setTimeout(refresh, 50); }}
              onDelete={removeSection}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
              <Layout className="h-5 w-5" />
            </div>
            <p className="text-xs text-zinc-600">No sections yet.<br />Add one below.</p>
          </div>
        </div>
      )}

      <div className="border-t border-white/5 p-2">
        <p className="text-[9px] font-medium text-zinc-600 uppercase mb-1.5 px-1">Add Section</p>
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-1">
          {DEFAULT_SECTIONS.map((entry) => {
            const Icon = getIcon(entry.name);
            return (
              <button key={entry.componentId} onClick={() => addSection(entry)}
                data-testid={`add-section-${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className="flex items-center gap-1.5 rounded-md bg-zinc-800/50 px-3 py-2.5 text-[11px] text-zinc-500 hover:bg-indigo-500/10 hover:text-indigo-300 hover:ring-1 hover:ring-indigo-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors lg:px-2 lg:py-1.5 lg:text-[10px]">
                <Icon className="h-3 w-3 shrink-0" />
                {entry.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
