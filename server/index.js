// Inkflow backend (Phase 2): Postgres-backed, creator accounts + admin review.
//   Auth:    POST /api/auth/register | /api/auth/login,  GET /api/me
//   Create:  POST /api/localize (auth) -> draft chapter (series + pages) in DB
//   Chapter: GET /api/chapters/:id,  POST /api/chapters/:id/publish (auth),  DELETE (auth)
//   Browse:  GET /api/library (published + approved),  GET /api/mine (auth)
//   Admin:   GET /api/admin/queue (admin),  POST /api/admin/chapters/:id/review (admin)
import "dotenv/config";
import express from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { localizePage } from "./localizer/vision.js";
import { renderPage } from "./localizer/render.js";
import { registerCreator, loginCreator, requireAuth, requireAdmin } from "./auth.js";
import * as lib from "./library.js";
import * as storage from "./storage.js";

const app = express();
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const MIME_OK = new Set(["image/jpeg", "image/png", "image/webp"]);
// Resolve the provider: honor LOCALIZE_MODEL only if that provider's key exists;
// otherwise fall back to whichever key is actually present. This keeps
// localization working even if LOCALIZE_MODEL points at a provider with no key.
function resolveModel() {
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  const want = process.env.LOCALIZE_MODEL;
  if (want === "gemini" && hasGemini) return "gemini";
  if (want === "claude" && hasClaude) return "claude";
  if (hasGemini) return "gemini";
  if (hasClaude) return "claude";
  return want || "claude";
}
const DEFAULT_MODEL = resolveModel();

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

// Diagnostics: reports which config the running server actually sees (booleans
// only, never secret values). Safe to expose; handy for verifying a deploy.
app.get("/api/health", (_req, res) => res.json({
  ok: true,
  model: DEFAULT_MODEL,
  storage: storage.STORAGE_DRIVER,
  env: {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    gemini: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    database: !!process.env.DATABASE_URL,
    jwt: !!process.env.JWT_SECRET,
    s3_endpoint: !!process.env.S3_ENDPOINT,
    s3_bucket: process.env.S3_BUCKET || null,
  },
}));

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
  const pagesMeta = [];
  for (let i = 0; i < rendered.length; i++) {
    const url = await storage.putPage(chapterId, i, rendered[i].png);
    pagesMeta.push({ idx: i, image_path: url, lines: rendered[i].lines });
  }
  await lib.createChapter({ creatorId: req.creator.id, title, genre, chapterId, pagesData: pagesMeta });

  res.json(await lib.getChapter(chapterId));
}));

// --- Chapter read / publish / delete ---
app.get("/api/chapters/:id", wrap(async (req, res) => {
  const ch = await lib.getChapter(req.params.id);
  if (!ch) return res.status(404).json({ error: "not found" });
  lib.incrementViews(req.params.id).catch(() => {}); // count the read, don't block
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
  await storage.deleteChapter(req.params.id);
  res.json({ ok: true });
}));

// --- Browse / discovery ---
app.get("/api/library", wrap(async (_req, res) => res.json(await lib.listPublic())));
app.get("/api/mine", requireAuth, wrap(async (req, res) => res.json(await lib.listMine(req.creator.id))));
app.get("/api/trending", wrap(async (_req, res) => res.json(await lib.trending())));
app.get("/api/search", wrap(async (req, res) => res.json(await lib.search(req.query.q || ""))));
app.get("/api/creators/:id", wrap(async (req, res) => {
  const profile = await lib.getCreatorProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "creator not found" });
  res.json(profile);
}));

// --- Admin review ---
app.get("/api/admin/queue", requireAuth, requireAdmin, wrap(async (_req, res) => res.json(await lib.adminQueue())));
app.post("/api/admin/chapters/:id/review", requireAuth, requireAdmin, wrap(async (req, res) => {
  const { decision, note } = req.body; // 'approve' | 'reject'
  const row = await lib.reviewChapter(req.params.id, decision, note || "");
  if (!row) return res.status(404).json({ error: "not found" });
  res.json(row);
}));

// --- Production: serve sample assets + the built SPA from this one service ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");
const DIST_DIR = join(ROOT, "dist");

app.use(express.static(PUBLIC_DIR)); // /pages/cooking|action sample images, etc.
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  // SPA fallback for client-side routes (anything that isn't an API call or a real file).
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(join(DIST_DIR, "index.html"));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Inkflow on :${PORT}  (model: ${DEFAULT_MODEL}, storage: ${storage.STORAGE_DRIVER}, spa: ${existsSync(DIST_DIR)})`)
);
