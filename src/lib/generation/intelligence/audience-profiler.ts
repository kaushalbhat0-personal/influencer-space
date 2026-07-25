import type { ContentSource, AudienceIntelligence } from "./types";

export class AudienceProfiler {
  profile(source: ContentSource): AudienceIntelligence {
    const text = this.getAllText(source).toLowerCase();
    const items = source.content ?? [];

    const ageRange = this.detectAgeRange(text);
    const primaryGender = this.detectGender(text);
    const language = this.detectLanguage(text);
    const countries = this.detectCountries(text);
    const interests = this.detectInterests(text);
    const income = this.detectIncomeLevel(text, source);
    const devicePref = this.detectDevicePreference(text);
    const hours = this.detectActiveHours(items);

    return {
      ageRange,
      primaryGender,
      primaryLanguage: language,
      topCountries: countries,
      interests,
      incomeLevel: income,
      devicePreference: devicePref,
      activeHours: hours,
      confidence: source.followers > 0 ? Math.min(0.3 + source.followers / 100000, 0.85) : 0.2,
    };
  }

  private detectAgeRange(text: string): string {
    if (/college|university|student|teen/i.test(text)) return "18-24";
    if (/career|professional|graduate|30/i.test(text)) return "25-34";
    if (/family|parent|40|midlife/i.test(text)) return "35-44";
    if (/retirement|50|senior/i.test(text)) return "45+";
    return "18-34";
  }

  private detectGender(text: string): string {
    const feminine = /\b(she|her|girls|women|female|mom|mother)\b/i;
    const masculine = /\b(he|him|guys|men|male|dad|father)\b/i;
    const fCount = (text.match(feminine) ?? []).length;
    const mCount = (text.match(masculine) ?? []).length;
    if (fCount > mCount * 1.5) return "female";
    if (mCount > fCount * 1.5) return "male";
    return "mixed";
  }

  private detectLanguage(text: string): string {
    const langPatterns: Record<string, RegExp> = {
      english: /\b(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|has|have|been|some|them|than|then|very|just|make|like|more|also|well|here|there|when|where|what|which|who)\b/i,
      spanish: /\b(que|los|las|del|con|por|para|como|más|pero|sus|son|era|han|está|muy|tiene|sobre|entre|siempre|también)\b/i,
      french: /\b(les|des|dans|avec|pour|plus|sur|fait|bien|sont|leur|tout|aussi|donc|entre|jamais|encore|même|comme|notre)\b/i,
      german: /\b(der|die|das|und|mit|auf|für|nicht|auch|sind|wird|sich|durch|über|nach|dieser|dieses|diesem|deinen|deiner)\b/i,
    };

    for (const [lang, pattern] of Object.entries(langPatterns)) {
      if (pattern.test(text)) return lang;
    }
    return "english";
  }

  private detectCountries(text: string): string[] {
    const knownCountries: Record<string, string> = {
      usa: "United States", us: "United States", america: "United States",
      uk: "United Kingdom", britain: "United Kingdom", england: "United Kingdom",
      canada: "Canada", australia: "Australia", india: "India",
      germany: "Germany", france: "France", spain: "Spain",
      japan: "Japan", brazil: "Brazil", mexico: "Mexico",
    };

    const found: string[] = [];
    const lower = text.toLowerCase();
    for (const [key, country] of Object.entries(knownCountries)) {
      if (lower.includes(key) && !found.includes(country)) found.push(country);
    }
    return found.slice(0, 3);
  }

  private detectInterests(text: string): string[] {
    const interestPatterns = [
      { interest: "Technology", pattern: /tech|gadget|software|app|digital|computer|code|programming|ai|startup/i },
      { interest: "Fitness", pattern: /fitness|workout|gym|exercise|health|yoga|running|training/i },
      { interest: "Gaming", pattern: /gaming|game|twitch|esports|stream|play/i },
      { interest: "Travel", pattern: /travel|trip|vacation|adventure|explore|wanderlust/i },
      { interest: "Food", pattern: /food|cook|recipe|baking|cuisine|restaurant|meal/i },
      { interest: "Music", pattern: /music|song|album|concert|band|guitar|piano|beat/i },
      { interest: "Fashion", pattern: /fashion|style|outfit|wear|dress|clothing|accessory/i },
      { interest: "Photography", pattern: /photo|camera|photography|edit|shot|capture/i },
      { interest: "Business", pattern: /business|entrepreneur|startup|marketing|revenue|growth/i },
      { interest: "Education", pattern: /learn|course|tutorial|study|education|lesson|teach/i },
    ];

    const interests: string[] = [];
    for (const { interest, pattern } of interestPatterns) {
      if (pattern.test(text)) interests.push(interest);
    }
    return interests.slice(0, 6);
  }

  private detectIncomeLevel(text: string, source: ContentSource): "low" | "medium" | "high" {
    const luxury = /luxury|premium|exclusive|high.?end|luxury/i;
    const budget = /budget|cheap|affordable|discount|sale|deal/i;
    if (luxury.test(text)) return "high";
    if (budget.test(text)) return "low";
    if (source.engagement > 0.1) return "high";
    return "medium";
  }

  private detectDevicePreference(text: string): "mobile" | "desktop" | "mixed" {
    const mobile = /app|mobile|ios|android|phone|iphone|tap|swipe/i;
    const desktop = /desktop|browser|windows|mac|keyboard|click/i;
    const mCount = (text.match(mobile) ?? []).length;
    const dCount = (text.match(desktop) ?? []).length;
    if (mCount > dCount * 2) return "mobile";
    if (dCount > mCount * 2) return "desktop";
    return "mixed";
  }

  private detectActiveHours(items: ContentItem[]): string[] {
    const hourCounts = new Map<number, number>();
    for (const item of items) {
      const d = new Date(item.createdAt);
      if (!isNaN(d.getTime())) {
        const h = d.getHours();
        hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
      }
    }

    return Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([h]) => `${h}:00-${h + 1}:00`);
  }

  private getAllText(source: ContentSource): string {
    const parts: string[] = [source.bio ?? ""];
    for (const item of source.content ?? []) {
      parts.push(item.text ?? "");
    }
    return parts.join(" ");
  }
}

interface ContentItem {
  text: string;
  hashtags: string[];
  createdAt: string;
  type: string;
}
