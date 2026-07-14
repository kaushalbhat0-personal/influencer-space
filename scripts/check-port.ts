import "dotenv/config";
import pg from "pg";
const { Pool } = pg;

async function testPort(port: number, label: string) {
  const url = process.env.DATABASE_URL?.replace(":6543", `:${port}`);
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 8000 });
  try {
    const client = await pool.connect();
    await client.query("SELECT 1 as ok");
    client.release();
    await pool.end();
    return { port, label, ok: true };
  } catch (e: any) {
    await pool.end();
    return { port, label, ok: false, error: e.message };
  }
}

async function main() {
  const results = await Promise.all([
    testPort(6543, "Transactional (PgBouncer)"),
    testPort(5432, "Session (Direct)"),
  ]);
  for (const r of results) {
    console.log(`${r.label} (:${r.port}): ${r.ok ? "✅ OK" : "❌ " + r.error}`);
  }
}
main();
