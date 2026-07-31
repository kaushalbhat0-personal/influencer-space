import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/observability/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

logger.info(`Supabase URL: ${supabaseUrl ? "Set" : "Missing"}`, "supabase");
logger.info(`Supabase Anon Key: ${supabaseAnonKey ? "Set" : "Missing"}`, "supabase");
logger.info(`Supabase Service Key: ${supabaseServiceKey ? "Set" : "Missing"}`, "supabase");

if (!supabaseUrl) {
  throw new Error("❌ NEXT_PUBLIC_SUPABASE_URL is required but missing.");
}
if (!supabaseAnonKey) {
  throw new Error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is required but missing.");
}

export const BUCKET = "influencer-images";

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;
