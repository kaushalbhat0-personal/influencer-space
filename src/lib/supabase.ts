import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("🔐 Supabase URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
console.log("🔐 Supabase Anon Key:", supabaseAnonKey ? "✅ Set" : "❌ Missing");
console.log("🔐 Supabase Service Key:", supabaseServiceKey ? "✅ Set" : "❌ Missing");

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

const storage = () => supabaseClient.storage.from(BUCKET);

export async function uploadImage(
  file: File,
  path: string,
): Promise<string> {
  const { data, error } = await storage().upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    throw new Error(
      error.message === "The resource already exists"
        ? "An image with that name already exists. Try again."
        : error.message,
    );
  }

  return getPublicUrl(data.path);
}

export function getPublicUrl(path: string): string {
  const { data } = storage().getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteImage(path: string): Promise<void> {
  const { error } = await storage().remove([path]);
  if (error) throw new Error(error.message);
}

export async function listImages(folder: string): Promise<string[]> {
  const { data, error } = await storage().list(folder, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error) throw new Error(error.message);
  return data.map((f) => f.name);
}
