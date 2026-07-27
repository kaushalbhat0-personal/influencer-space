import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  const pool = new Pool({
    host: url.hostname,
    port: parseInt(url.port || "6543"),
    database: url.pathname.slice(1),
    user: url.username,
    password: url.password,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  const fs = await import("fs");

  try {
    const adminRes = await client.query(`SELECT id, email FROM "User" WHERE role = 'SUPER_ADMIN'`);
    const superAdmins = adminRes.rows;
    console.log(`Preserving ${superAdmins.length} super admin(s):`, superAdmins.map((u: { email: string }) => u.email).join(", "));

    const sql = fs.readFileSync(new URL("./clean-db.sql", import.meta.url), "utf-8");
    await client.query(sql);

    console.log("Done. Database cleaned.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Clean failed:", e);
  process.exit(1);
});
