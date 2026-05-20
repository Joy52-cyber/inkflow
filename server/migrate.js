// Applies db/schema.sql, then ensures an admin account exists.
// Usage: npm run migrate
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { pool, one } from "./db/pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("✗ DATABASE_URL not set in .env — cannot migrate.");
    process.exit(1);
  }
  const sql = await readFile(join(__dirname, "db", "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("✓ schema applied");

  // Seed an admin from env if provided and not already present.
  const email = process.env.ADMIN_EMAIL;
  const pw = process.env.ADMIN_PASSWORD;
  if (email && pw) {
    const existing = await one("SELECT id FROM creators WHERE email=$1", [email]);
    if (!existing) {
      const hash = await bcrypt.hash(pw, 10);
      await pool.query(
        "INSERT INTO creators (email, display_name, password_hash, role) VALUES ($1,$2,$3,'admin')",
        [email, "Admin", hash]
      );
      console.log(`✓ admin created: ${email}`);
    } else {
      await pool.query("UPDATE creators SET role='admin' WHERE email=$1", [email]);
      console.log(`✓ admin role ensured: ${email}`);
    }
  } else {
    console.log("• set ADMIN_EMAIL + ADMIN_PASSWORD in .env to auto-create an admin");
  }
  await pool.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error("✗ migration failed:", e.message);
  process.exit(1);
});
