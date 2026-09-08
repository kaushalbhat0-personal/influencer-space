/**
 * Resume text extraction — minimal, tenant-scoped, no secrets in logs.
 * Supports text/plain, text/csv (utf-8) and application/pdf (unpdf).
 * DOCX deliberately deferred (P2) per audit.
 */
export async function extractResumeText(buffer: Buffer, mimeType: string): Promise<string> {
  if (!buffer || buffer.length === 0) throw new Error("Resume file is empty");

  if (mimeType === "text/plain" || mimeType === "text/csv") {
    const text = buffer.toString("utf-8");
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Resume text is empty");
    // Cap at ~12k chars — enough for knowledgeGraph bio without blowing token limits
    return trimmed.slice(0, 12000);
  }

  if (mimeType === "application/pdf") {
    try {
      const { extractText } = await import("unpdf");
      const data = new Uint8Array(buffer);
      const result = await extractText(data, { mergePages: true });
      const text = (typeof result.text === "string" ? result.text : String(result.text ?? "")).trim();
      if (!text) throw new Error("PDF contains no extractable text");
      return text.slice(0, 12000);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "PDF parsing failed";
      const isInternal =
        raw.includes("ENOENT") || raw.includes("test/data") || raw.includes("module.parent");
      const msg = isInternal ? "PDF parsing failed" : raw;
      throw new Error(msg.slice(0, 300));
    }
  }

  throw new Error(`Unsupported resume MIME type: ${mimeType}`);
}

/**
 * Very light name inference from resume text — first non-empty line that looks like a name.
 * Falls back to filename.
 */
export function inferResumeName(text: string, fallbackFilename: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const first = lines[0];
    // Heuristic: 2-4 words, each capitalized, no @ or http
    if (first.length < 60 && !first.includes("@") && !first.includes("http") && first.split(/\s+/).length <= 4) {
      return first;
    }
  }
  const base = fallbackFilename.replace(/\.[^.]+$/, "");
  return base || "Creator";
}

// ─────────────────────────────────────────────────────────────────────────────
// RCCF-PRELAUNCH-12A — deterministic ResumeSource + parseResume
// ─────────────────────────────────────────────────────────────────────────────
import type {
  ResumeSource,
  ResumeExperience,
  ResumeProject,
  ResumeEducation,
  ResumeSocialLink,
} from "@/lib/generation/intelligence/types";

function normalizeHeading(line: string): string {
  return line.replace(/:$/,"").trim().toLowerCase();
}

const HEADING_PATTERNS: Record<string, RegExp> = {
  summary: /^(profile|summary|about|objective|bio|professional summary)$/,
  skills: /^(technical skills|skills|expertise|core competencies|core skills)$/,
  projects: /^(projects|key projects|selected work|portfolio|featured projects)$/,
  experience: /^(work experience|experience|employment|professional experience|career history|work history)$/,
  education: /^(education|academic background|academics|qualifications|academic qualifications)$/,
  certifications: /^(certifications?|certificates?|licenses?|awards?|achievements?)$/,
};

function detectHeadingType(line: string): string | null {
  const h = normalizeHeading(line);
  for (const [type, re] of Object.entries(HEADING_PATTERNS)) {
    if (re.test(h)) return type;
  }
  return null;
}

function extractSocialLinksFromText(text: string): ResumeSocialLink[] {
  const links: ResumeSocialLink[] = [];
  const seen = new Set<string>();
  // Strict social patterns — protocol-optional but host must be known social
  const pattern = /(?:https?:\/\/)?(?:www\.)?(github\.com\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]*)?|linkedin\.com\/(?:in|company)\/[A-Za-z0-9_-]+|twitter\.com\/[A-Za-z0-9_]+|x\.com\/[A-Za-z0-9_]+|instagram\.com\/[A-Za-z0-9_.]+|gitlab\.com\/[A-Za-z0-9_.-]+|behance\.net\/[A-Za-z0-9_-]+|dribbble\.com\/[A-Za-z0-9_-]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    let raw = m[0].replace(/[.,;)\]]+$/,"").trim();
    if (!raw) continue;
    // Normalize to https:// if no scheme
    let url = raw;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url.replace(/^www\./i,"");
    // Strip trailing punctuation
    url = url.replace(/[.,;]+$/,"");
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const lower = url.toLowerCase();
    let platform = "other";
    if (lower.includes("github.com")) platform = "github";
    else if (lower.includes("linkedin.com")) platform = "linkedin";
    else if (lower.includes("twitter.com") || lower.includes("x.com")) platform = "twitter";
    else if (lower.includes("instagram.com")) platform = "instagram";
    else if (lower.includes("gitlab.com")) platform = "gitlab";
    else if (lower.includes("behance.net")) platform = "behance";
    else if (lower.includes("dribbble.com")) platform = "dribbble";
    links.push({ platform, url });
  }
  // Also capture plain email-less github shorthand like "github.com/kaushal..." without protocol already handled
  return links.slice(0, 10);
}

function extractLocation(lines: string[], rawText: string): string | null {
  // Check first ~6 lines for "City, Country" pattern separated by "|"
  const headerLines = lines.slice(0, 6);
  const headerJoined = headerLines.join(" | ");
  const pipeParts = headerJoined.split("|").map((p) => p.trim()).filter(Boolean);
  for (const part of pipeParts) {
    if (part.includes("@") || part.toLowerCase().includes("github.com") || part.toLowerCase().includes("linkedin.com")) continue;
    // Simple city,country pattern: "Pune, India" — letters, comma, letters
    if (/^[A-Za-z][A-Za-z\s.-]{1,30},\s*[A-Za-z][A-Za-z\s.-]{1,30}$/.test(part) && part.length < 50) {
      // Avoid matching skill-like lists
      if (part.split(",").length === 2 && !part.toLowerCase().includes("typescript")) return part;
    }
  }
  // Fallback: look for location keywords in header
  for (const line of headerLines) {
    if (/^[A-Za-z\s]+,\s*[A-Za-z\s]+$/.test(line.trim()) && line.trim().length < 40 && !line.includes("@")) {
      return line.trim();
    }
  }
  void rawText;
  return null;
}

function parseSkillsSection(slice: string[]): string[] {
  const skills: string[] = [];
  const seen = new Set<string>();
  for (const line of slice) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("●") || trimmed.startsWith("-") || trimmed.startsWith("*")) continue; // shouldn't happen in skills
    // Lines like "Languages: TypeScript, Python, Dart, SQL"
    let payload = trimmed;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx >= 0) {
      payload = trimmed.slice(colonIdx + 1);
    }
    const parts = payload.split(",").map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      // Clean up fragments like "Tailwind CSS v4" keep as-is, but skip empty/bullet
      if (part.length < 2 || part.length > 60) continue;
      // Avoid splitting tech like "Next.js 16" keep
      const key = part.toLowerCase();
      if (seen.has(key)) continue;
      // Filter out obvious non-skills like single chars
      if (/^[0-9]+$/.test(part)) continue;
      seen.add(key);
      skills.push(part);
    }
  }
  return skills.slice(0, 80);
}

function parseProjectsSection(slice: string[]): ResumeProject[] {
  const projects: ResumeProject[] = [];
  let currentHeader: string | null = null;
  let currentDesc: string[] = [];
  let inOther = false;

  function flush() {
    if (currentHeader || currentDesc.length > 0) {
      const name = (currentHeader ?? "").trim();
      const description = currentDesc.join(" ").replace(/\s+/g," ").trim();
      // Only emit if we have a header-like name or substantial description
      if (name || description) {
        // For Other Projects bullets, name may be the bullet text before " — "
        if (name) {
          // Clean trailing tech spill: if name contains " | " keep left part as name
          const cleanName = name.split("|")[0].trim();
          projects.push({ name: cleanName.slice(0, 120), description: description.slice(0, 500), raw: `${name}${description ? " — " + description : ""}`.slice(0, 800) });
        } else if (description) {
          projects.push({ name: description.slice(0, 60), description: description.slice(0, 500), raw: description.slice(0, 800) });
        }
      }
    }
    currentHeader = null;
    currentDesc = [];
  }

  for (const rawLine of slice) {
    const line = rawLine.trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower === "other projects") {
      flush();
      inOther = true;
      continue;
    }
    const isBullet = line.startsWith("●") || line.startsWith("•") || line.startsWith("- ") || line.startsWith("* ");
    const hasDash = line.includes(" — ") || line.includes(" - ");

    if (inOther) {
      if (isBullet) {
        flush();
        // Each bullet is its own project: "● 3D Printables — Next.js e-commerce with ..."
        const content = line.replace(/^[\u2022\u00B7●•\-\*]\s*/,"").trim();
        const dashIdx = content.indexOf(" — ");
        let name = content;
        let desc = "";
        if (dashIdx >= 0) {
          name = content.slice(0, dashIdx).trim();
          desc = content.slice(dashIdx + 3).trim();
        } else if (content.indexOf(" - ") >= 0) {
          const idx = content.indexOf(" - ");
          name = content.slice(0, idx).trim();
          desc = content.slice(idx + 3).trim();
        }
        // Handle continuation? Next non-bullet lines are rare in Other Projects
        projects.push({ name: name.slice(0, 120), description: desc.slice(0, 500), raw: content.slice(0, 800) });
        continue;
      } else {
        // Continuation of previous bullet's description (rare)
        if (projects.length > 0) {
          const last = projects[projects.length - 1];
          last.description = (last.description + " " + line).slice(0, 500);
          last.raw = (last.raw + " " + line).slice(0, 800);
        }
        continue;
      }
    }

    // Main projects mode
    if (!isBullet && hasDash) {
      // This looks like a project header: "Legacy Modernization Platform — COBOL to NestJS..."
      flush();
      // Header may be split across two lines: first contains " — ", second is tech stack continuation without dash
      // We'll treat this line as header start; continuation lines without dash and without bullet will be appended to header
      currentHeader = line;
      continue;
    }
    if (currentHeader !== null && !isBullet && !hasDash && currentDesc.length === 0) {
      // Possible continuation of header tech list (e.g., "Query, Vitest, Zod, Web Workers, Docker")
      // Heuristic: if line is short and contains commas and no sentence-like verb, append to header
      if (line.split(",").length >= 3 || (line.length < 80 && /,/.test(line) && !/\s(is|are|was|were|with|for|that)/i.test(line))) {
        currentHeader = currentHeader + " " + line;
        continue;
      }
    }
    // Description or bullet
    if (isBullet) {
      // Strip bullet
      const content = line.replace(/^[\u2022\u00B7●•\-\*]\s*/,"").trim();
      currentDesc.push(content);
    } else {
      // Plain description line
      currentDesc.push(line);
    }
  }
  flush();
  return projects.slice(0, 20);
}

function parseExperienceSection(slice: string[]): ResumeExperience[] {
  const experiences: ResumeExperience[] = [];
  let currentHeader: string | null = null;
  let currentBullets: string[] = [];

  function flush() {
    if (currentHeader) {
      const raw = [currentHeader, ...currentBullets].join(" | ");
      // Parse header: "Operations Head — Money Craft TraderJul 2025 – Present"
      let title = currentHeader;
      let company: string | undefined;
      let duration: string | undefined;
      // Split by " — " first
      const dashParts = currentHeader.split(" — ");
      if (dashParts.length >= 2) {
        title = dashParts[0].trim();
        const rest = dashParts.slice(1).join(" — ").trim();
        // rest may contain company + date jammed: "Money Craft TraderJul 2025 – Present"
        // Find date pattern: e.g., "Jul 2025 – Present" or "Dec 2023 – Jun 2025" or "(2015 – 2019)"
        const dateRe = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\s*[–—-]\s*(?:Present|\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}))/i;
        const dateMatch = rest.match(dateRe);
        if (dateMatch && dateMatch.index !== undefined) {
          const idx = dateMatch.index;
          company = rest.slice(0, idx).trim().replace(/Jul$/,"").replace(/Jun$/,"").trim();
          duration = dateMatch[1].trim();
          // Clean company trailing concatenated month artifact: "TraderJul" -> "Trader"
          company = company.replace(/([A-Za-z])(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*$/i, (m, p1) => company!.slice(0, company!.indexOf(m) + m.length - 3).trim() || company!);
          // Fallback simple: if company still ends with capital letter jam, trim last 3 chars if they look like "Jul" fragment
          if (/[A-Za-z]Jul$/.test(company) || /[A-Za-z]Jun$/.test(company)) {
            company = company.replace(/(Jul|Jun)$/,"").trim();
          }
        } else {
          // No date found, treat rest as company
          company = rest.slice(0, 80).trim();
        }
      }
      const description = currentBullets.join(" ").replace(/\s+/g," ").trim().slice(0, 800);
      experiences.push({
        title: title.slice(0, 120),
        company: company?.slice(0, 120),
        duration: duration?.slice(0, 60),
        description,
        raw: raw.slice(0, 800),
      });
    }
    currentHeader = null;
    currentBullets = [];
  }

  for (const rawLine of slice) {
    const line = rawLine.trim();
    if (!line) continue;
    const isBullet = line.startsWith("●") || line.startsWith("•") || line.startsWith("- ") || line.startsWith("* ");
    const hasDash = line.includes(" — ") || line.includes(" - ");
    // Header heuristic: contains " — " and not bullet, and length < 120, and next lines are bullets
    if (!isBullet && hasDash && line.length < 150) {
      flush();
      currentHeader = line;
      continue;
    }
    if (currentHeader !== null) {
      if (isBullet) {
        currentBullets.push(line.replace(/^[\u2022\u00B7●•\-\*]\s*/,"").trim());
      } else {
        // Continuation of bullet text (wrapped line)
        if (currentBullets.length > 0) {
          currentBullets[currentBullets.length - 1] += " " + line;
        } else {
          // Non-bullet description after header before bullets (rare)
          currentBullets.push(line);
        }
      }
    }
  }
  flush();
  return experiences.slice(0, 15);
}

function parseEducationSection(slice: string[]): ResumeEducation[] {
  const education: ResumeEducation[] = [];
  for (const rawLine of slice) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("●") || line.startsWith("•")) continue;
    // Expected: "Bachelor of Computer Science — Sinhgad College ... (2015 – 2019)"
    const clean = line.replace(/^[\u2022\u00B7●•\-\*]\s*/,"").trim();
    if (clean.length < 5) continue;
    // Split by " — "
    const parts = clean.split(" — ");
    let degree = clean;
    let institution: string | undefined;
    let years: string | undefined;
    if (parts.length >= 2) {
      degree = parts[0].trim();
      const rest = parts.slice(1).join(" — ").trim();
      // Extract years in parentheses
      const yearMatch = rest.match(/\(([^)]+)\)\s*$/);
      if (yearMatch) {
        years = yearMatch[1].trim();
        institution = rest.slice(0, yearMatch.index).trim();
      } else {
        // Try find date pattern without parens
        const dateRe = /(\d{4}\s*[–—-]\s*\d{4}|Present)/i;
        const dm = rest.match(dateRe);
        if (dm) {
          years = dm[0].trim();
          institution = rest.slice(0, dm.index).trim();
        } else {
          institution = rest;
        }
      }
    }
    education.push({
      degree: degree.slice(0, 120),
      institution: institution?.slice(0, 150),
      years: years?.slice(0, 60),
      raw: clean.slice(0, 500),
    });
  }
  return education.slice(0, 10);
}

function parseCertificationsSection(slice: string[]): string[] {
  const certs: string[] = [];
  for (const rawLine of slice) {
    const line = rawLine.replace(/^[\u2022\u00B7●•\-\*]\s*/,"").trim();
    if (!line || line.length < 3) continue;
    certs.push(line.slice(0, 200));
  }
  return certs.slice(0, 20);
}

export function parseResume(text: string): ResumeSource {
  const rawText = text.trim().slice(0, 12000);
  const empty: ResumeSource = {
    rawText,
    summary: "",
    experience: [],
    skills: [],
    projects: [],
    education: [],
    certifications: [],
    socialLinks: [],
    location: null,
  };
  if (!rawText || rawText.length < 30) return empty;

  const lines = rawText.split(/\r?\n/);
  // Detect headings
  const headingIndices: Array<{ type: string; index: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const t = detectHeadingType(lines[i].trim());
    if (t) headingIndices.push({ type: t, index: i });
  }

  // Build section slices (lines between headings)
  const sectionMap = new Map<string, string[]>();
  // If no headings, return empty-ish but still try social/location
  if (headingIndices.length === 0) {
    // No structured headings → treat as non-resume, return mostly empty but extract social/location
    const socialLinks = extractSocialLinksFromText(rawText);
    const location = extractLocation(lines, rawText);
    return { ...empty, socialLinks, location };
  }

  // For each heading, slice until next heading
  for (let h = 0; h < headingIndices.length; h++) {
    const cur = headingIndices[h];
    const nextIdx = h + 1 < headingIndices.length ? headingIndices[h + 1].index : lines.length;
    const slice = lines.slice(cur.index + 1, nextIdx);
    // If multiple same-type headings appear, concatenate
    const existing = sectionMap.get(cur.type) ?? [];
    sectionMap.set(cur.type, [...existing, ...slice]);
  }

  const summary = (sectionMap.get("summary") ?? []).join(" ").replace(/\s+/g," ").trim().slice(0, 1000);
  const skillsSlice = sectionMap.get("skills") ?? [];
  const projectsSlice = sectionMap.get("projects") ?? [];
  const experienceSlice = sectionMap.get("experience") ?? [];
  const educationSlice = sectionMap.get("education") ?? [];
  const certificationsSlice = sectionMap.get("certifications") ?? [];

  const skills = parseSkillsSection(skillsSlice);
  const projects = parseProjectsSection(projectsSlice);
  const experience = parseExperienceSection(experienceSlice);
  const education = parseEducationSection(educationSlice);
  const certifications = parseCertificationsSection(certificationsSlice);
  const socialLinks = extractSocialLinksFromText(rawText);
  const location = extractLocation(lines, rawText);

  return {
    rawText,
    summary,
    experience,
    skills,
    projects,
    education,
    certifications,
    socialLinks,
    location,
  };
}

/**
 * Heuristic: is this free-text likely a resume? Used by acquisition to decide
 * whether to populate ContentSource.resume vs leaving it as ordinary bio.
 * Requires at least 2 resume heading types or a strong combination of signals
 * (e.g., skills+experience or projects+education) and a minimum length.
 */
export function isLikelyResume(text: string): boolean {
  if (!text || text.trim().length < 100) return false;
  const lower = text.toLowerCase();
  const headingHits = [
    /profile|summary/,
    /technical skills|skills/,
    /projects/,
    /work experience|experience/,
    /education/,
    /certifications?/,
  ].filter((re) => re.test(lower)).length;
  if (headingHits >= 2) return true;
  // Also accept if contains email+location-like plus at least one heading keyword
  const hasEmail = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text);
  const hasHeadingKeyword = /(experience|education|skills|projects|certifications)/i.test(text);
  if (hasEmail && hasHeadingKeyword && headingHits >= 1) return true;
  return false;
}
