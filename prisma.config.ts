import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // RCCF-LAUNCH-01: Prisma CLI/migrate commands run against the DIRECT
  // PostgreSQL connection (Supavisor :5432) — DDL/advisory-lock operations
  // fail against the pooled endpoint. Runtime (src/lib/prisma.ts) continues to
  // use the pooled DATABASE_URL for connection pooling.
  datasource: {
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
