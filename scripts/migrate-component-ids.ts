/**
 * IMPLEMENTATION-13 — Component ID data migration.
 *
 * One-time migration: rewrites every legacy/unregistered component id in the
 * Block table to its canonical registered equivalent. After this migration no
 * Block.moduleId can reference a component that is absent from the
 * ComponentRegistry, so neither the renderer nor the publish validator can ever
 * emit "Unknown component".
 *
 * Run:  npx tsx scripts/migrate-component-ids.ts --apply   (default is dry-run)
 */

import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// Legacy → canonical mapping (source of truth = ComponentRegistry).
// Every target below is a registered component id.
const MIGRATION_MAP: Record<string, string> = {
  "hero.agency": "hero.default",
  "hero.music": "hero.default",
  "hero.restaurant": "hero.default",
  "hero.portfolio": "hero.default",
  "hero.creator": "hero.default",
  "hero.professional": "hero.default",
  "hero.corporate": "hero.default",
  "hero.minimal": "hero.default",
  "about.summary": "about.default",
  "products.featured": "products.grid",
  "services.grid": "services.default",
  "services.list": "services.default",
  "pricing.table": "pricing.default",
  "testimonials.carousel": "testimonials.default",
  "reviews.carousel": "testimonials.default",
  "faq.accordion": "faq.default",
  "newsletter.signup": "newsletter.default",
  "contact.form": "contact.default",
  "booking.cta": "contact.default",
  "cta.contact": "contact.default",
  "cta.signup": "contact.default",
  "cta.banner": "contact.default",
  "social.proof": "links.default",
  "portfolio.grid": "gallery.grid",
  "case_studies.grid": "gallery.grid",
  "videos.gallery": "gallery.grid",
  "menu.preview": "gallery.grid",
  "location.map": "contact.default",
  "community.preview": "links.default",
  "programs.grid": "services.default",
  "stats": "timeline.default",
};

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("No database URL available. Set DIRECT_URL or DATABASE_URL.");
    process.exit(1);
  }

  const apply = process.argv.includes("--apply");
  console.log(`Component ID migration — ${apply ? "APPLYING" : "DRY RUN (use --apply to commit)"}`);

  const parsed = new URL(url);
  const pool = new Pool({
    host: parsed.hostname,
    port: parseInt(parsed.port || "5432"),
    database: parsed.pathname.slice(1),
    user: parsed.username,
    password: parsed.password,
    ssl: parsed.searchParams.get("sslmode") === "disable"
      ? false
      : { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    const legacyIds = Object.keys(MIGRATION_MAP);
    const before = await client.query(
      `SELECT "moduleId", COUNT(*)::int AS count FROM "Block" WHERE "moduleId" = ANY($1) GROUP BY "moduleId" ORDER BY "moduleId"`,
      [legacyIds],
    );
    const totalLegacy = before.rows.reduce((sum, r) => sum + (r.count ?? 0), 0);
    console.log(`Found ${totalLegacy} block(s) with legacy component ids.`);
    for (const row of before.rows) {
      console.log(`  ${row.moduleId}: ${row.count}`);
    }

    if (totalLegacy === 0) {
      console.log("Nothing to migrate.");
      return;
    }

    let migrated = 0;
    if (apply) {
      for (const [from, to] of Object.entries(MIGRATION_MAP)) {
        const res = await client.query(
          `UPDATE "Block" SET "moduleId" = $2, "updatedAt" = NOW() WHERE "moduleId" = $1`,
          [from, to],
        );
        migrated += res.rowCount ?? 0;
      }
    }

    const after = await client.query(
      `SELECT COUNT(*)::int AS count FROM "Block" WHERE "moduleId" = ANY($1)`,
      [legacyIds],
    );
    console.log(apply
      ? `Migrated ${migrated} block(s). Remaining legacy ids: ${after.rows[0].count}.`
      : `No changes committed (dry run). ${after.rows[0].count} legacy block(s) would be migrated.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
