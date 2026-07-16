const { Client } = require("pg");

async function main() {
  const client = new Client({
    host: "43.202.154.182", port: 5432, database: "postgres",
    user: "postgres.flhllvzzbtkfrcrajicq", password: "x5hovWkJtpg1d0B0",
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const tables = ["GalleryImage", "TimelineEvent", "Product", "AffiliateLink"];
  for (const tbl of tables) {
    const r = await client.query(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`,
      [tbl]
    );
    console.log(`--- ${tbl} ---`);
    r.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type}, nullable=${c.is_nullable})`));
  }

  await client.end();
}

main().catch(console.error);
