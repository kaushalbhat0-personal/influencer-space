import { prisma } from "@/lib/prisma";

export type LegalPageKey = "privacy" | "terms" | "refund" | "disclaimer";

export interface LegalContent {
  title: string;
  content: string; // markdown/plain
  updatedAt?: string;
}

const DEFAULTS: Record<LegalPageKey, LegalContent> = {
  privacy: {
    title: "Privacy Policy",
    content: `## Privacy Policy

[Business Name] respects your privacy and is committed to protecting your personal information.

We collect only what we need to provide our services and improve your experience. We do not sell your personal data.

**What we collect**
- Contact details you share (name, email)
- Usage data to improve the site

**How we use it**
- To deliver products and support
- To communicate important updates

For questions, contact us through the storefront contact form.

*These are general templates. Please review and customize for your business and local requirements.*`,
  },
  terms: {
    title: "Terms & Conditions",
    content: `## Terms & Conditions

Welcome to [Business Name]. By using this website you agree to these terms.

**Products & Services**
Descriptions are provided in good faith. Prices and availability may change.

**Orders**
We will confirm orders after payment. We reserve the right to refuse service.

*These are general templates. Please review and customize for your business and local requirements.*`,
  },
  refund: {
    title: "Refund & Cancellation Policy",
    content: `## Refund & Cancellation Policy

We want you to be happy with your purchase.

If you have an issue with a product or service, contact us within a reasonable timeframe and we will review your request.

Refunds, where applicable, are processed to the original payment method.

*These are general templates. Please review and customize for your business and local requirements.*`,
  },
  disclaimer: {
    title: "Disclaimer",
    content: `## Disclaimer

The information on this website is provided for general informational purposes.

We make no guarantees about completeness or accuracy. Use of this site is at your own risk.

*These are general templates. Please review and customize for your business and local requirements.*`,
  },
};

function keyFor(page: LegalPageKey) { return `legal_${page}`; }

export const legalService = {
  async get(tenantId: string, page: LegalPageKey): Promise<LegalContent> {
    const setting = await prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: keyFor(page) } } });
    const value = setting?.value as unknown as LegalContent | null;
    if (value?.title || value?.content) return { title: value.title || DEFAULTS[page].title, content: value.content || DEFAULTS[page].content, updatedAt: value.updatedAt };
    return DEFAULTS[page];
  },
  async getAll(tenantId: string): Promise<Record<LegalPageKey, LegalContent>> {
    const keys = (["privacy","terms","refund","disclaimer"] as LegalPageKey[]).map(keyFor);
    const rows = await prisma.setting.findMany({ where: { tenantId, key: { in: keys } } });
    const map = new Map(rows.map(r => [r.key, r.value as unknown as LegalContent]));
    const out = {} as Record<LegalPageKey, LegalContent>;
    for (const k of ["privacy","terms","refund","disclaimer"] as LegalPageKey[]) {
      const v = map.get(keyFor(k)) as LegalContent | undefined;
      out[k] = v?.title || v?.content ? { title: v.title || DEFAULTS[k].title, content: v.content || DEFAULTS[k].content, updatedAt: v.updatedAt } : DEFAULTS[k];
    }
    return out;
  },
  async update(tenantId: string, page: LegalPageKey, input: LegalContent): Promise<LegalContent> {
    const merged = { title: input.title.trim() || DEFAULTS[page].title, content: input.content, updatedAt: new Date().toISOString() };
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: keyFor(page) } },
      create: { tenantId, key: keyFor(page), value: merged as unknown as Record<string, unknown> as never },
      update: { value: merged as unknown as Record<string, unknown> as never },
    });
    return merged;
  },
};
