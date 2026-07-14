import "dotenv/config";
import pg from "pg";
const { Pool } = pg;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  const res = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
     ORDER BY table_name`
  );
  console.log("Tables in public schema:");
  for (const row of res.rows) {
    const c = await pool.query(`SELECT COUNT(*)::int as cnt FROM "${row.table_name}"`);
    console.log(`  ${row.table_name} (${c.rows[0].cnt} rows)`);
  }
  await pool.end();
}
main();
