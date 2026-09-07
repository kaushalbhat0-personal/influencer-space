export interface ConfigCheck {
  key: string;
  label: string;
  required: boolean;
  present: boolean;
}

const REQUIRED_CONFIGS: Array<{ key: string; label: string }> = [
  { key: "DATABASE_URL", label: "PostgreSQL Database" },
  { key: "NEXTAUTH_SECRET", label: "NextAuth Secret" },
  { key: "NEXTAUTH_URL", label: "NextAuth URL" },
  { key: "RAZORPAY_KEY_ID", label: "Razorpay Key ID" },
  { key: "RAZORPAY_KEY_SECRET", label: "Razorpay Key Secret" },
  { key: "RAZORPAY_WEBHOOK_SECRET", label: "Razorpay Webhook Secret" },
  { key: "NEXT_PUBLIC_RAZORPAY_KEY_ID", label: "Razorpay Public Key" },
  { key: "NEXT_PUBLIC_APP_URL", label: "Public App URL" },
  { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase Anon Key" },
  { key: "TOKEN_ENCRYPTION_KEY", label: "Encryption Key (TOKEN_ENCRYPTION_KEY)" },
];

const OPTIONAL_CONFIGS: Array<{ key: string; label: string }> = [
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase Service Role Key" },
  { key: "OPENAI_API_KEY", label: "OpenAI API Key" },
  { key: "CRON_SECRET", label: "Cron Job Secret" },
  { key: "HEALTH_SECRET", label: "Health Check Secret" },
  { key: "TWITCH_CLIENT_ID", label: "Twitch Client ID" },
  { key: "VERCEL_TOKEN", label: "Vercel API Token" },
  { key: "VERCEL_TEAM_ID", label: "Vercel Team ID" },
  { key: "VERCEL_PROJECT_ID", label: "Vercel Project ID" },
];

function decodeEncryptionKey(raw: string): Buffer | null {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return Buffer.from(trimmed, "hex");
  try {
    return Buffer.from(trimmed, "base64");
  } catch {
    return null;
  }
}

export function validateConfig(): { ok: boolean; checks: ConfigCheck[]; errors: string[] } {
  const checks: ConfigCheck[] = [];
  const errors: string[] = [];

  for (const cfg of REQUIRED_CONFIGS) {
    const present = !!process.env[cfg.key];
    checks.push({ key: cfg.key, label: cfg.label, required: true, present });
    if (!present) errors.push(`Missing required config: ${cfg.label} (${cfg.key})`);
  }

  for (const cfg of OPTIONAL_CONFIGS) {
    checks.push({ key: cfg.key, label: cfg.label, required: false, present: !!process.env[cfg.key] });
  }

  // SEC-06: validate TOKEN_ENCRYPTION_KEY entropy — must decode to exactly
  // 32 bytes (same logic as src/lib/crypto.ts decodeKey). Do not log secret.
  const rawKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (rawKey) {
    const decoded = decodeEncryptionKey(rawKey);
    if (!decoded || decoded.length !== 32) {
      errors.push(
        `Invalid TOKEN_ENCRYPTION_KEY: must decode to 32 bytes (got ${decoded ? decoded.length : 0}). Use 'openssl rand -hex 32' (64 hex) or 'openssl rand -base64 32' (44 chars).`,
      );
    }
  }

  return { ok: errors.length === 0, checks, errors };
}
