import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET_NAME = "influencer-images";

export async function GET(request: Request) {
  const configuredSecret = process.env.HEALTH_SECRET;
  if (!configuredSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("x-health-secret");
  if (!authHeader || authHeader !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = {
    status: "ok" as string,
    database: "disconnected" as string,
    storage: "disconnected" as string,
    timestamp: new Date().toISOString(),
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
      throw new Error("Storage not configured");
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
