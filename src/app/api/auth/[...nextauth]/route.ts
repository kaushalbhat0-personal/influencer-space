import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

console.log("Auth API loaded");
console.log(
  "NEXTAUTH_SECRET:",
  process.env.NEXTAUTH_SECRET ? "Set" : "Missing",
);
console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL || "Missing");

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
