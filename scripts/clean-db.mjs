import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });

async function main() {
  console.log("Finding super admins...");
  const { rows: admins } = await pool.query('SELECT id, email FROM "User" WHERE role = $1', ["SUPER_ADMIN"]);
  console.log(`Preserving ${admins.length} super admin(s):`, admins.map((u) => u.email).join(", "));

  const tables = [
    "PublishSnapshot", "PublishStatus",
    "Block", "Section", "Page",
    "BlogPost", "TimelineEvent", "GalleryImage", "Game",
    "AffiliateLink", "ContactSubmission",
    "ProductOrderItem", "ProductOrder", "Product",
    "BillingEvent", "BillingSubscription", "BillingAccount",
    "PlatformEvent", "AuditLog", "AnalyticsEvent",
    "GenerationSessionEvent", "GenerationSessionStage", "GenerationSession",
    "Setting",
    "Website", "WebsiteAgency",
    "WorkspaceMember", "Workspace",
    "Tenant",
  ];

  for (const table of tables) {
    process.stdout.write(`Deleting ${table}... `);
    try {
      const r = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`, [table]);
      if (!r.rows[0].exists) { console.log("skipped (not found)"); continue; }
      await pool.query(`DELETE FROM "${table}"`);
      console.log("ok");
    } catch (e) {
      console.log(`error: ${e.message}`);
    }
  }

  process.stdout.write("Deleting non-super-admin Users... ");
  await pool.query(`DELETE FROM "User" WHERE role != $1`, ["SUPER_ADMIN"]);
  console.log("ok");

  for (const { schema, table, filter } of [
    { schema: "auth", table: "sessions", filter: `"userId" NOT IN (SELECT id FROM public."User" WHERE role = 'SUPER_ADMIN')` },
    { schema: "auth", table: "mfa_factors", filter: "true" },
    { schema: "auth", table: "mfa_challenges", filter: "true" },
    { schema: "auth", table: "one_time_tokens", filter: "true" },
    { schema: "auth", table: "saml_providers", filter: "true" },
    { schema: "auth", table: "saml_relay_states", filter: "true" },
    { schema: "auth", table: "flow_state", filter: "true" },
  ]) {
    process.stdout.write(`Deleting ${schema}.${table}... `);
    try {
      const r = await pool.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)`, [schema, table]);
      if (!r.rows[0].exists) { console.log("skipped"); continue; }
      await pool.query(`DELETE FROM ${schema}."${table}" WHERE ${filter}`);
      console.log("ok");
    } catch (e) {
      console.log(`error: ${e.message}`);
    }
  }

  console.log("\nDone.");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
