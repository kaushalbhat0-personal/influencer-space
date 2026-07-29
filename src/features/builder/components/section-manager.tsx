"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { builderStore } from "@/lib/builder/store";
import { builderEditor } from "@/lib/builder/commands/editor";
import { cn } from "@/lib/utils";
import {
  Eye, EyeOff, ExternalLink, Trash2, Copy, ArrowUp, ArrowDown,
  ShoppingBag, Image, User, HelpCircle, Trophy, Gamepad2, Rss,
  Link2, MessageSquare, Mail, CreditCard, BookOpen, Music,
  MessageCircle, Sparkles, Layout, GripVertical,
} from "lucide-react";

const SECTION_ICONS: Record<string, typeof ShoppingBag> = {
  hero: Sparkles, about: User, products: ShoppingBag, gallery: Image,
  testimonials: MessageSquare, faq: HelpCircle, timeline: Trophy,
  games: Gamepad2, contentFeed: Rss, links: Link2, footer: Layout,
  contact: Mail, newsletter: Rss, pricing: CreditCard, courses: BookOpen,
  embed: Music, social: MessageCircle,
};

function getIcon(sectionName: string) {
  const key = sectionName.toLowerCase();
  return SECTION_ICONS[key] ?? Layout;
}

const EDIT_LINKS: Record<string, string> = {
  "hero.default": "/admin/settings", "hero.gaming": "/admin/settings",
  "hero.fitness": "/admin/settings", "hero.education": "/admin/settings",
  "about.default": "/admin/profile", "products.grid": "/admin/products",
  "gallery.grid": "/admin/gallery", "testimonials.default": "/admin/testimonials",
  "faq.default": "/admin/faq", "timeline.default": "/admin/milestones",
  "games.default": "/admin/games", "links.default": "/admin/links",
  "contentFeed.default": "/admin/settings/content",
};

const CONTENT_LABELS: Record<string, string> = {
  products: "Products", gallery: "Images", testimonials: "Testimonials",
  faq: "Items", timeline: "Events", games: "Games", links: "Links",
  hero: "Hero", about: "About", footer: "Footer", contact: "Contact",
  newsletter: "Subscribers", pricing: "Plans", courses: "Courses",
  embed: "Embeds", social: "Links", contentFeed: "Posts",
};

const DEFAULT_SECTIONS = [
  "Hero", "About", "Products", "Gallery", "Timeline",
  "Testimonials", "FAQ", "Newsletter", "Contact", "Footer",
];

interface SectionData {
  id: string;
  name: string;
  visible: boolean;
  slotCount: number;
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

  return (
      <div
        onClick={() => onSelect(section.id)}
        className={cn(
          "group flex items-center gap-1.5 rounded-lg px-2 py-2 cursor-pointer transition-colors",
          isSelected
            ? "bg-s8ul-cyan/10 text-s8ul-cyan ring-1 ring-s8ul-cyan/20"
            : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200"
        )}
      >
      <div className="flex items-center gap-0.5 shrink-0 cursor-grab active:cursor-grabbing text-zinc-700">
        <GripVertical className="h-3 w-3" />
      </div>

      <Icon className="h-4 w-4 shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium truncate">{section.name}</span>
          {section.slotCount > 0 && (
            <span className="text-[9px] text-zinc-600 shrink-0">
              {section.slotCount} {contentLabel.toLowerCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn(
            "flex items-center gap-0.5 text-[9px]",
            section.visible ? "text-emerald-600" : "text-zinc-700"
          )}>
            {section.visible ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
            {section.visible ? "Visible" : "Hidden"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(section.id); }}
          disabled={index === 0}
          className="rounded p-0.5 text-zinc-700 hover:bg-white/10 hover:text-zinc-400 disabled:opacity-20">
          <ArrowUp className="h-3 w-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(section.id); }}
          disabled={index === total - 1}
          className="rounded p-0.5 text-zinc-700 hover:bg-white/10 hover:text-zinc-400 disabled:opacity-20">
          <ArrowDown className="h-3 w-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(section.id); }}
          className="rounded p-0.5 text-zinc-700 hover:bg-white/10 hover:text-zinc-400">
          {section.visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>
        {editHref && (
          <Link href={editHref} className="rounded p-0.5 text-zinc-700 hover:bg-white/10 hover:text-s8ul-cyan"
            onClick={(e) => e.stopPropagation()}>
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(section.id); }}
          className="rounded p-0.5 text-zinc-700 hover:bg-white/10 hover:text-zinc-400">
          <Copy className="h-3 w-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}
          className="rounded p-0.5 text-zinc-700 hover:bg-red-500/20 hover:text-red-400">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function SectionManager({ className }: { className?: string }) {
  const [sections, setSections] = useState<SectionData[]>([]);

  const refresh = useCallback(() => {
    const canvas = builderStore.canvas;
    const page = canvas.pages.find((p) => p.id === canvas.activePageId);
    setSections(
      page?.sections?.map((s) => ({
        id: s.id,
        name: s.name,
        visible: s.visible,
        slotCount: s.slots.length,
        moduleIds: s.slots.map((sl) => sl.moduleId),
      })) ?? []
    );
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 1500);
    return () => clearInterval(interval);
  }, [refresh]);

  const addSection = useCallback((name: string) => {
    builderStore.addSection(name);
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
    if (section) { section.visible = !section.visible; refresh(); }
  }, [refresh]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {sections.length > 0 ? (
        <div className="flex-1 overflow-y-auto space-y-0.5 p-1.5">
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
          <p className="text-xs text-zinc-600 text-center">No sections yet.<br />Add one below.</p>
        </div>
      )}

      <div className="border-t border-white/5 p-2">
        <p className="text-[9px] font-medium text-zinc-700 uppercase mb-1.5 px-1">Add Section</p>
        <div className="grid grid-cols-2 gap-1">
          {DEFAULT_SECTIONS.map((name) => {
            const Icon = getIcon(name);
            return (
              <button key={name} onClick={() => addSection(name)}
                className="flex items-center gap-1.5 rounded-md bg-zinc-800/50 px-2 py-1.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
                <Icon className="h-3 w-3 shrink-0" />
                {name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
