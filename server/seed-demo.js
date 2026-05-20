// Seeds a few published+approved demo works so discovery (trending/search/
// profiles) has content. Reuses the generated sample page images (no API calls).
// Idempotent: skips if the demo creator already exists. Run: node server/seed-demo.js
import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { pool, one } from "./db/pool.js";

const DEMO = [
  { creator: "Rin Tanaka", email: "rin@inkflow.demo", title: "Midnight Ramen", genre: "cooking", accent: "#f59e0b", set: "cooking", pages: 4, views: 142 },
  { creator: "Rin Tanaka", email: "rin@inkflow.demo", title: "Blade of the Tide", genre: "action", accent: "#06b6d4", set: "action", pages: 4, views: 357 },
  { creator: "Mika Aoki", email: "mika@inkflow.demo", title: "Neon Ronin", genre: "action", accent: "#22d3ee", set: "action", pages: 4, views: 88 },
];

async function creatorId(name, email) {
  const existing = await one("SELECT id FROM creators WHERE email=$1", [email]);
  if (existing) return existing.id;
  const hash = await bcrypt.hash("demo-password", 10);
  const row = await one(
    "INSERT INTO creators (email, display_name, password_hash) VALUES ($1,$2,$3) RETURNING id",
    [email, name, hash]
  );
  return row.id;
}

async function main() {
  if (await one("SELECT id FROM creators WHERE email='rin@inkflow.demo'")) {
    console.log("• demo data already present — skipping");
    await pool.end();
    return;
  }
  for (const d of DEMO) {
    const cid = await creatorId(d.creator, d.email);
    const series = await one(
      "INSERT INTO series (creator_id, title, genre, accent) VALUES ($1,$2,$3,$4) RETURNING id",
      [cid, d.title, d.genre, d.accent]
    );
    const chId = randomUUID();
    await pool.query(
      `INSERT INTO chapters (id, series_id, title, number, status, review_status, views, published_at)
       VALUES ($1,$2,$3,1,'published','approved',$4, now())`,
      [chId, series.id, "Ch. 1", d.views]
    );
    for (let i = 0; i < d.pages; i++) {
      await pool.query(
        "INSERT INTO pages (chapter_id, idx, image_path, lines) VALUES ($1,$2,$3,'[]')",
        [chId, i, `/pages/${d.set}/p${i + 1}.png`]
      );
    }
    console.log(`✓ ${d.title} by ${d.creator} (${d.views} views)`);
  }
  await pool.end();
  console.log("Done.");
}

main().catch((e) => { console.error("seed failed:", e.message); process.exit(1); });
