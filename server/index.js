// Inkflow localization backend (Phase 1).
// POST /api/localize  — JP/KO page(s) in -> localized English page(s) saved as a chapter.
// GET  /api/uploads   — list localized works.  GET /api/uploads/:id — one work.
import "dotenv/config";
import express from "express";
import multer from "multer";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { localizePage } from "./localizer/vision.js";
import { renderPage } from "./localizer/render.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const UPLOADS_DIR = join(ROOT, "public", "pages", "uploads");
const DB_PATH = join(__dirname, "uploads.json");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const MIME_OK = new Set(["image/jpeg", "image/png", "image/webp"]);

// Pick provider: Claude works today (Gemini key is expired). Override with ?model=gemini.
const DEFAULT_MODEL = process.env.LOCALIZE_MODEL || "claude";

async function loadDb() {
  if (!existsSync(DB_PATH)) return [];
  try { return JSON.parse(await readFile(DB_PATH, "utf8")); } catch { return []; }
}
async function saveDb(rows) { await writeFile(DB_PATH, JSON.stringify(rows, null, 2)); }

const ACCENTS = { cooking: "#f59e0b", action: "#06b6d4" };

// Home/browse only shows published works; drafts are reachable by id (for preview).
app.get("/api/uploads", async (_req, res) => res.json((await loadDb()).filter((r) => r.published)));
app.get("/api/uploads/:id", async (req, res) => {
  const row = (await loadDb()).find((r) => r.id === req.params.id);
  if (!row) return res.status(404).json({ error: "not found" });
  res.json(row);
});

// Promote a draft to published.
app.post("/api/uploads/:id/publish", async (req, res) => {
  const rows = await loadDb();
  const row = rows.find((r) => r.id === req.params.id);
  if (!row) return res.status(404).json({ error: "not found" });
  row.published = true;
  row.status = "Published";
  row.publishedAt = Date.now();
  await saveDb(rows);
  res.json(row);
});

// Discard a draft (or remove a work) and its page images.
app.delete("/api/uploads/:id", async (req, res) => {
  const rows = await loadDb();
  const idx = rows.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "not found" });
  rows.splice(idx, 1);
  await saveDb(rows);
  await rm(join(UPLOADS_DIR, req.params.id), { recursive: true, force: true }).catch(() => {});
  res.json({ ok: true });
});

app.post("/api/localize", upload.array("pages", 20), async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: "No pages uploaded." });
    for (const f of files) if (!MIME_OK.has(f.mimetype)) return res.status(400).json({ error: `Unsupported type: ${f.mimetype}` });

    const title = (req.body.title || "Untitled").trim().slice(0, 80);
    const genre = ACCENTS[req.body.genre] ? req.body.genre : "action";
    const model = req.body.model === "gemini" ? "gemini" : DEFAULT_MODEL;

    const id = `u_${Date.now().toString(36)}`;
    const outDir = join(UPLOADS_DIR, id);
    await mkdir(outDir, { recursive: true });

    const pages = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const result = await localizePage({
        model,
        base64: f.buffer.toString("base64"),
        mimeType: f.mimetype,
        promptOpts: { targetLang: "en" },
      });
      const png = await renderPage(f.buffer, result.regions);
      await writeFile(join(outDir, `p${i + 1}.png`), png);
      pages.push({ src: `/pages/uploads/${id}/p${i + 1}.png`, lines: result.regions });
    }

    const row = {
      id, title, genre, accent: ACCENTS[genre],
      author: "You", status: "Draft", published: false, createdAt: Date.now(),
      pageCount: pages.length, pages,
    };
    const rows = await loadDb();
    rows.unshift(row);
    await saveDb(rows);
    res.json(row);
  } catch (e) {
    console.error("localize error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Inkflow API on http://localhost:${PORT}  (model: ${DEFAULT_MODEL})`));
