import { supabaseAdmin, supabaseClient, BUCKET } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check env vars
  results.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅" : "❌";
  results.supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅" : "❌";
  results.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅" : "❌";
  results.supabaseAdminExists = !!supabaseAdmin;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is missing", ...results }, { status: 500 });
  }

  // 2. List all buckets (requires service key)
  try {
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    if (bucketsError) {
      results.listBucketsError = bucketsError.message;
    } else {
      results.buckets = buckets.map((b) => ({ name: b.name, public: b.public }));
    }
  } catch (e) {
    results.listBucketsError = String(e);
  }

  // 3. Check our specific bucket
  try {
    const { data: bucket, error: bucketError } = await supabaseAdmin.storage.getBucket(BUCKET);
    if (bucketError) {
      results.getBucketError = bucketError.message;
    } else {
      results.bucket = { name: bucket.name, public: bucket.public };
    }
  } catch (e) {
    results.getBucketError = String(e);
  }

  // 4. Try listing files in the bucket (public client)
  try {
    const { data: files, error: filesError } = await supabaseClient.storage.from(BUCKET).list();
    if (filesError) {
      results.listFilesError = filesError.message;
    } else {
      results.fileCount = files.length;
    }
  } catch (e) {
    results.listFilesError = String(e);
  }

  // 5. Key prefix check (anon vs service role)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  results.keyPrefix = key.substring(0, 20) + "...";
  results.keyLength = key.length;

  return NextResponse.json(results);
}
