// Inkflow backend (Phase 2): Postgres-backed, creator accounts + admin review.
//   Auth:    POST /api/auth/register | /api/auth/login,  GET /api/me
//   Create:  POST /api/localize (auth) -> draft chapter (series + pages) in DB
//   Chapter: GET /api/chapters/:id,  POST /api/chapters/:id/publish (auth),  DELETE (auth)
//   Browse:  GET /api/library (published + approved),  GET /api/mine (auth)
//   Admin:   GET /api/admin/queue (admin),  POST /api/admin/chapters/:id/review (admin)
import "dotenv/config";
import express from "express";
import multer from "multer";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { localizePage } from "./localizer/vision.js";
import { renderPage } from "./localizer/render.js";
import { registerCreator, loginCreator, requireAuth, requireAdmin } from "./auth.js";
import * as lib from "./library.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, "..", "public", "pages", "uploads");

const app = express();
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const MIME_OK = new Set(["image/jpeg", "image/png", "image/webp"]);
const DEFAULT_MODEL = process.env.LOCALIZE_MODEL || "claude";

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(`${req.method} ${req.path}:`, e.message);
  res.status(e.status || 500).json({ error: e.message });
});

// --- Auth ---
app.post("/api/auth/register", wrap(async (req, res) => {
  const { email, displayName, password } = req.body;
  res.json(await registerCreator({ email, displayName, password }));
}));

app.post("/api/auth/login", wrap(async (req, res) => {
  const { email, password } = req.body;
  res.json(await loginCreator({ email, password }));
}));

app.get("/api/me", requireAuth, (req, res) => res.json({ creator: req.creator }));

// --- Localize: creates a draft chapter owned by the logged-in creator ---
app.post("/api/localize", requireAuth, upload.array("pages", 20), wrap(async (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: "No pages uploaded." });
  for (const f of files) if (!MIME_OK.has(f.mimetype)) return res.status(400).json({ error: `Unsupported type: ${f.mimetype}` });

  const title = (req.body.title || "Untitled").trim().slice(0, 80);
  const genre = req.body.genre === "cooking" ? "cooking" : "action";
  const model = req.body.model === "gemini" ? "gemini" : DEFAULT_MODEL;

  // Localize all pages first (in memory), then persist + write files keyed by the new chapter id.
  const rendered = [];
  for (const f of files) {
    const result = await localizePage({
      model, base64: f.buffer.toString("base64"), mimeType: f.mimetype,
      promptOpts: { targetLang: "en" },
    });
    rendered.push({ png: await renderPage(f.buffer, result.regions), lines: result.regions });
  }

  // Generate the chapter id up front so page image paths are known before insert.
  const chapterId = randomUUID();
  const pagesMeta = rendered.map((r, i) => ({
    idx: i, image_path: `/pages/uploads/${chapterId}/p${i + 1}.png`, lines: r.lines,
  }));
  await lib.createChapter({ creatorId: req.creator.id, title, genre, chapterId, pagesData: pagesMeta });

  const outDir = join(UPLOADS_DIR, chapterId);
  await mkdir(outDir, { recursive: true });
  for (let i = 0; i < rendered.length; i++) {
    await writeFile(join(outDir, `p${i + 1}.png`), rendered[i].png);
  }

  res.json(await lib.getChapter(chapterId));
}));

// --- Chapter read / publish / delete ---
app.get("/api/chapters/:id", wrap(async (req, res) => {
  const ch = await lib.getChapter(req.params.id);
  if (!ch) return res.status(404).json({ error: "not found" });
  res.json(ch);
}));

app.post("/api/chapters/:id/publish", requireAuth, wrap(async (req, res) => {
  const ok = await lib.publishChapter(req.params.id, req.creator.id);
  if (!ok) return res.status(404).json({ error: "not found or not yours" });
  res.json(await lib.getChapter(req.params.id));
}));

app.delete("/api/chapters/:id", requireAuth, wrap(async (req, res) => {
  const ok = await lib.deleteChapter(req.params.id, req.creator.id);
  if (!ok) return res.status(404).json({ error: "not found or not yours" });
  await rm(join(UPLOADS_DIR, req.params.id), { recursive: true, force: true }).catch(() => {});
  res.json({ ok: true });
}));

// --- Browse ---
app.get("/api/library", wrap(async (_req, res) => res.json(await lib.listPublic())));
app.get("/api/mine", requireAuth, wrap(async (req, res) => res.json(await lib.listMine(req.creator.id))));

// --- Admin review ---
app.get("/api/admin/queue", requireAuth, requireAdmin, wrap(async (_req, res) => res.json(await lib.adminQueue())));
app.post("/api/admin/chapters/:id/review", requireAuth, requireAdmin, wrap(async (req, res) => {
  const { decision, note } = req.body; // 'approve' | 'reject'
  const row = await lib.reviewChapter(req.params.id, decision, note || "");
  if (!row) return res.status(404).json({ error: "not found" });
  res.json(row);
}));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Inkflow API on http://localhost:${PORT}  (model: ${DEFAULT_MODEL})`));
