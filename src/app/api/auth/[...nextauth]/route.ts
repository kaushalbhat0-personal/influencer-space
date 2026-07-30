import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/observability/logger";

logger.info("Auth API loaded", "nextauth-route");
logger.info(`NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? "Set" : "Missing"}`, "nextauth-route");
logger.info(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || "Missing"}`, "nextauth-route");

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
