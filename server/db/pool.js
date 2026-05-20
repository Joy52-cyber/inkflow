// Single shared pg pool. Reads DATABASE_URL from .env.
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway/managed PG needs SSL; local does not. Toggle with PGSSL=true.
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
});

export const query = (text, params) => pool.query(text, params);

// One row helper.
export async function one(text, params) {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
}
