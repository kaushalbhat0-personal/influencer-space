import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const BUCKET = "influencer-images";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Setting up bucket: ${BUCKET}`);

  const { data: existing } = await supabase.storage.getBucket(BUCKET);
  if (existing) {
    console.log(`Bucket "${BUCKET}" already exists, skipping creation.`);
  } else {
    const { data, error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/svg+xml",
      ],
    });

    if (error) {
      console.error("Failed to create bucket:", error.message);
      process.exit(1);
    }

    console.log(`Bucket "${BUCKET}" created successfully:`, data);
  }

  console.log("\nDone! Now set up RLS policies in Supabase Dashboard:");
  console.log("  Storage → influencer-images → Policies → Add policies");
  console.log("  Enable: Public Read, Authenticated Upload, Owner Update, Owner Delete");
}

main().catch(console.error);
