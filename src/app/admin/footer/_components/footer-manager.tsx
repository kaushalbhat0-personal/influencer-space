"use client";

import { useState, useCallback } from "react";
import { saveFooterConfig, saveFooterSocialLinks } from "@/actions/footer.actions";
import type { FooterColumn } from "@/types/snapshot";
import type { HeroSocialLink } from "@/config/hero";
import { Plus, Trash2, Save, ExternalLink } from "lucide-react";

export function FooterManager({
  initialDescription,
  initialCopyright,
  initialColumns,
  initialSocialLinks,
}: {
  initialDescription: string | null;
  initialCopyright: string | null;
  initialColumns: FooterColumn[];
  initialSocialLinks: HeroSocialLink[];
}) {
  const [description, setDescription] = useState(initialDescription ?? "");
  const [copyright, setCopyright] = useState(initialCopyright ?? "");
  const [columns, setColumns] = useState<FooterColumn[]>(initialColumns);
  const [socialLinks, setSocialLinks] = useState<HeroSocialLink[]>(initialSocialLinks);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const flashSaved = useCallback(() => { setSaved(true); setTimeout(()=>setSaved(false),2000); }, []);

  const persistFooter = useCallback(async (cols: FooterColumn[], desc: string, copy: string) => {
    setSaving(true);
    await saveFooterConfig({ description: desc || null, copyright: copy || null, columns: cols });
    setSaving(false); flashSaved();
  }, [flashSaved]);

  const persistSocial = useCallback(async (links: HeroSocialLink[]) => {
    setSaving(true);
    await saveFooterSocialLinks(links);
    setSaving(false); flashSaved();
  }, [flashSaved]);

  const updateColumnTitle = (idx:number, title:string) => {
    const next = columns.map((c,i)=> i===idx? {...c, title}:c);
    setColumns(next); persistFooter(next, description, copyright);
  };
  const addColumn = () => {
    const next = [...columns, { title: "New Column", links: [{ label: "Link", href: "#products" }] }];
    setColumns(next); persistFooter(next, description, copyright);
  };
  const removeColumn = (idx:number) => {
    const next = columns.filter((_,i)=>i!==idx);
    setColumns(next); persistFooter(next, description, copyright);
  };
  const addLink = (colIdx:number) => {
    const next = columns.map((c,i)=> i===colIdx? {...c, links:[...c.links, { label:"New Link", href:"#products"}]}:c);
    setColumns(next); persistFooter(next, description, copyright);
  };
  const updateLink = (colIdx:number, linkIdx:number, field:"label"|"href", value:string) => {
    const next = columns.map((c,i)=> i===colIdx? {...c, links: c.links.map((l,j)=> j===linkIdx? {...l, [field]:value}:l)}:c);
    setColumns(next); persistFooter(next, description, copyright);
  };
  const removeLink = (colIdx:number, linkIdx:number) => {
    const next = columns.map((c,i)=> i===colIdx? {...c, links: c.links.filter((_,j)=>j!==linkIdx)}:c);
    setColumns(next); persistFooter(next, description, copyright);
  };

  const addSocial = () => {
    const next = [...socialLinks, { platform:"instagram", url:"https://", label:"Instagram"}];
    setSocialLinks(next); persistSocial(next);
  };
  const updateSocial = (idx:number, field: keyof HeroSocialLink, value:string) => {
    const next = socialLinks.map((l,i)=> i===idx? {...l, [field]:value}:l);
    setSocialLinks(next); persistSocial(next);
  };
  const removeSocial = (idx:number) => {
    const next = socialLinks.filter((_,i)=>i!==idx);
    setSocialLinks(next); persistSocial(next);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 text-xs">
        {saving && <span className="text-[var(--text-muted)]">Saving…</span>}
        {saved && <span className="text-emerald-400">Saved</span>}
        <span className="text-[var(--text-muted)]">Changes publish with your next deploy. Footer is independent from Hero CTAs.</span>
      </div>

      {/* Footer Content */}
      <section className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Footer Content</h2>
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Footer Description</label>
          <textarea value={description} onChange={e=>{setDescription(e.target.value);}} onBlur={()=>persistFooter(columns, description, copyright)} placeholder="Short brand description for footer" className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)]" rows={2} />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)]">Copyright</label>
          <input value={copyright} onChange={e=>setCopyright(e.target.value)} onBlur={()=>persistFooter(columns, description, copyright)} placeholder="© 2026 Northstar Studio — All rights reserved." className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)]" />
        </div>
      </section>

      {/* Footer Columns */}
      <section className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Footer Columns</h2>
          <button onClick={addColumn} className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-black"><Plus className="h-3 w-3"/>Add Column</button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">Each column is a group of footer navigation links. These are independent from Hero CTAs and header Navigation.</p>
        <div className="space-y-4">
          {columns.map((col, ci)=>(
            <div key={ci} className="rounded-lg border border-white/5 bg-zinc-950/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input value={col.title} onChange={e=>updateColumnTitle(ci, e.target.value)} className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-sm text-white" placeholder="Column title" />
                <button onClick={()=>removeColumn(ci)} className="rounded p-1.5 text-[var(--text-muted)] hover:text-red-400"><Trash2 className="h-4 w-4"/></button>
              </div>
              <div className="space-y-2">
                {col.links.map((l, li)=>(
                  <div key={li} className="flex gap-2">
                    <input value={l.label} onChange={e=>updateLink(ci, li, "label", e.target.value)} placeholder="Label" className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white" />
                    <input value={l.href} onChange={e=>updateLink(ci, li, "href", e.target.value)} placeholder="Href (#products or /privacy)" className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white" />
                    <button onClick={()=>removeLink(ci, li)} className="rounded p-1.5 text-[var(--text-muted)] hover:text-red-400"><Trash2 className="h-3 w-3"/></button>
                  </div>
                ))}
                <button onClick={()=>addLink(ci)} className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1"><Plus className="h-3 w-3"/>Add Footer Link</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Social Links (shared) */}
      <section className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Social Links</h2>
          <button onClick={addSocial} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--text-primary)]"><Plus className="h-3 w-3"/>Add Social Link</button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">Shared site social profiles — shown in both Hero and Footer. Changing here updates Footer without touching Hero CTAs.</p>
        <div className="space-y-2">
          {socialLinks.map((l, i)=>(
            <div key={i} className="flex gap-2 items-center">
              <input value={l.platform} onChange={e=>updateSocial(i, "platform", e.target.value)} placeholder="platform (instagram, linkedin...)" className="w-32 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white" />
              <input value={l.url} onChange={e=>updateSocial(i, "url", e.target.value)} placeholder="https://" className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white" />
              <input value={l.label ?? ""} onChange={e=>updateSocial(i, "label", e.target.value)} placeholder="Label (optional)" className="w-32 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white" />
              <button onClick={()=>removeSocial(i)} className="rounded p-1.5 text-[var(--text-muted)] hover:text-red-400"><Trash2 className="h-3 w-3"/></button>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><ExternalLink className="h-3 w-3"/></a>
            </div>
          ))}
          {socialLinks.length===0 && <p className="text-xs text-[var(--text-muted)]">No social links yet.</p>}
        </div>
      </section>

      <div className="rounded-lg border border-white/5 bg-zinc-900/30 p-3">
        <p className="text-xs text-[var(--text-muted)]">Footer links are independent from Hero CTAs (<code className="text-[var(--text-muted)]">Start a Project / View Work</code>). Header Navigation changes do not rewrite Footer columns.</p>
      </div>
    </div>
  );
}
