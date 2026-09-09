import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/observability/error-tracker";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const MAX_PAYLOAD_BYTES = 5 * 1024; // 5KB
const MAX_MESSAGE_LEN = 2000;
const MAX_STACK_LEN = 8000;
const MAX_ROUTE_LEN = 500;
const MAX_OPERATION_LEN = 200;

function getClientIp(request: NextRequest): string {
  try {
    const h = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
    if (h) return h.split(",")[0].trim();
  } catch {}
  try {
    const hl = headers();
    return hl.get("x-forwarded-for")?.split(",")[0].trim() ?? hl.get("x-real-ip") ?? "client-error";
  } catch {
    return "client-error";
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(`client-error:${ip}`, "/api/observability/client-error");
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (rawBody.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messageRaw = typeof body.message === "string" ? body.message.trim() : "";
  if (!messageRaw) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }
  const message = messageRaw.slice(0, MAX_MESSAGE_LEN);
  const stackRaw = typeof body.stack === "string" ? body.stack.slice(0, MAX_STACK_LEN) : undefined;
  const routeRaw = typeof body.route === "string" ? body.route.slice(0, MAX_ROUTE_LEN) : undefined;
  const operationRaw = typeof body.operation === "string" ? body.operation.slice(0, MAX_OPERATION_LEN) : undefined;
  const correlationIdRaw = typeof body.correlationId === "string" ? body.correlationId.slice(0, 100) : undefined;

  // Never trust client-supplied tenantId
  let tenantId: string | undefined;
  try {
    const session = await getServerSession(authOptions);
    tenantId = session?.user?.tenantId ?? undefined;
    // Agency users have no tenantId — keep undefined, SystemError tenantIds will be empty but still captured
    if (!tenantId && session?.user?.agencyId) {
      // For agency, we could resolve agency tenant, but for client errors we keep tenantId empty to avoid leakage
      tenantId = undefined;
    }
  } catch {
    tenantId = undefined;
  }

  // Browser metadata only if non-sensitive (userAgent)
  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? undefined;

  // Route: prefer client-supplied route, fallback to referer/header
  let route: string | undefined = routeRaw;
  if (!route) {
    try {
      route = request.headers.get("referer")?.slice(0, MAX_ROUTE_LEN) ?? headers().get("referer")?.slice(0, MAX_ROUTE_LEN) ?? undefined;
    } catch {
      route = routeRaw;
    }
  }

  const error = new Error(message);
  if (stackRaw) error.stack = stackRaw;
  // Do not persist raw bodies, cookies, headers, payment data — only message/stack/route/operation are used

  captureError(error, {
    service: "client",
    operation: operationRaw ?? "client_error",
    correlation: correlationIdRaw,
    tenantId,
    route,
    level: "ERROR",
  });

  // Also log browser metadata via logger? captureError already does logger.error with route
  // We don't persist userAgent separately to keep payload minimal, but could add to metadata if needed non-sensitive

  return NextResponse.json({ ok: true });
}
