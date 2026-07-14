import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET_NAME = "influencer-images";
const HEALTH_SECRET = process.env.HEALTH_SECRET || "local-dev-secret";

export async function GET(request: Request) {
  const authHeader = request.headers.get("x-health-secret");
  if (!authHeader || authHeader !== HEALTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = {
    status: "ok" as string,
    database: "disconnected" as string,
    storage: "disconnected" as string,
    timestamp: new Date().toISOString(),
    env: {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      databaseUrl: !!process.env.DATABASE_URL,
      nextauthSecret: !!process.env.NEXTAUTH_SECRET,
    },
    errors: [] as string[],
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    result.database = "connected";
  } catch (error) {
    result.database = "error";
    result.errors.push(`Database: ${String(error)}`);
  }

  try {
    if (!supabaseAdmin) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
    }

    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();

    if (bucketError) {
      throw new Error(bucketError.message);
    }

    const bucket = buckets?.find((b) => b.name === BUCKET_NAME);
    if (!bucket) {
      throw new Error(`Bucket "${BUCKET_NAME}" not found`);
    }

    const { error: listError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list("", { limit: 1 });

    if (listError) {
      throw new Error(listError.message);
    }

    result.storage = "connected";
  } catch (error) {
    result.storage = "error";
    result.errors.push(`Storage: ${String(error)}`);
  }

  const allOk = result.database === "connected" && result.storage === "connected";
  result.status = allOk ? "ok" : "degraded";

  return NextResponse.json(result, { status: allOk ? 200 : 500 });
}
