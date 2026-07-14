import "dotenv/config";
import pg from "pg";
const { Pool } = pg;

const snaxData = {
  name: "Raj 'Snax' Varma",
  tagline: "S8UL Esports | BGMI Pro | Content Creator",
  bio: "BGMI Pro for S8UL Esports. Hyderabadi at heart, grinding every day. From ranked pushes to tournament victories — representing the S8UL squad on the national stage. Building the biggest gaming community in India, one clip at a time.",
  social: {
    instagram: "https://instagram.com/snaxgaming",
    youtube: "https://youtube.com/@SnaxGaming",
    twitter: "",
    tiktok: "",
  },
  profileImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=400&fit=crop",
  niche: "gaming",
  colors: {
    primary: "#2D1B69",
    secondary: "#00f5ff",
    accent: "#ff00e5",
  },
};

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL?.replace(":6543", ":5432"),
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    await client.query(
      'UPDATE "Setting" SET value = $1 WHERE key = $2',
      [JSON.stringify(snaxData), "influencer_data"]
    );
    console.log("Settings updated to Snax!");
    client.release();
  } catch (e: any) {
    console.log("Error:", e.message);
  }
  await pool.end();
}

main();
