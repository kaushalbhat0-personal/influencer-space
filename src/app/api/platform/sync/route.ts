import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PlatformRegistrySyncService } from "@/lib/registry-sync";
import { captureError } from "@/lib/observability/error-tracker";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get("dryRun") !== "false";
    const planCodes = searchParams.get("planCodes")?.split(",").filter(Boolean);

    const service = new PlatformRegistrySyncService();
    const report = await service.sync({ dryRun, planCodes });

    return NextResponse.json({ success: report.errors.length === 0, report });
  } catch (e) {
    // RCCF-72.17A: never leak internal exception detail to callers.
    captureError(e, { service: "platform-sync-api", operation: "POST" });
    return NextResponse.json({
      success: false,
      error: "Internal error",
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const planCodes = searchParams.get("planCodes")?.split(",").filter(Boolean);

    const service = new PlatformRegistrySyncService();
    const report = await service.getDiff({ planCodes });

    return NextResponse.json({ success: true, report });
  } catch (e) {
    // RCCF-72.17A: never leak internal exception detail to callers.
    captureError(e, { service: "platform-sync-api", operation: "GET" });
    return NextResponse.json({
      success: false,
      error: "Internal error",
    }, { status: 500 });
  }
}
