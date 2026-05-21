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
import { localizePage, retranslateLine } from "./localizer/vision.js";
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

  const chapterId = randomUUID();
  const pagesMeta = [];
  let totalBubbles = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const result = await localizePage({
      model, base64: f.buffer.toString("base64"), mimeType: f.mimetype,
      promptOpts: { targetLang: "en" },
    });
    // Annotate each bubble with the AI baseline so we can measure later edits.
    const lines = result.regions.map((r) => ({ ...r, ai_translation: r.translation, edited: false, retries: 0 }));
    totalBubbles += lines.length;
    const png = await renderPage(f.buffer, result.regions);
    const image_path = await storage.putPage(chapterId, i, png);
    await storage.putOriginal(chapterId, i, f.buffer); // keep source for re-render
    pagesMeta.push({ idx: i, image_path, original_path: `original:${chapterId}:${i}`, lines });
  }
  await lib.createChapter({ creatorId: req.creator.id, title, genre, chapterId, pagesData: pagesMeta, totalBubbles });

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

// --- Reviewer: retranslate one bubble, save edits + re-render, post-publish feedback ---

// "Retry" a single bubble: re-localize its source text into an alternate.
app.post("/api/chapters/:id/retranslate", requireAuth, wrap(async (req, res) => {
  if (!(await lib.isOwner(req.params.id, req.creator.id))) return res.status(404).json({ error: "not found or not yours" });
  const { pageIdx, bubbleIdx, guidance } = req.body;
  const ch = await lib.getChapter(req.params.id);
  const page = ch.pages.find((p) => p.idx === pageIdx);
  const bubble = page?.lines?.[bubbleIdx];
  if (!bubble) return res.status(400).json({ error: "bubble not found" });
  const model = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) && DEFAULT_MODEL !== "claude" ? "gemini" : DEFAULT_MODEL;
  const alt = await retranslateLine({ model, original: bubble.original, guidance });
  bubble.translation = alt;
  bubble.retries = (bubble.retries || 0) + 1;
  await lib.updatePageLines(req.params.id, pageIdx, page.lines);
  await lib.recomputeMetrics(req.params.id);
  res.json({ translation: alt });
}));

// Save edited translations and re-render the affected pages from the original art.
app.post("/api/chapters/:id/revise", requireAuth, wrap(async (req, res) => {
  if (!(await lib.isOwner(req.params.id, req.creator.id))) return res.status(404).json({ error: "not found or not yours" });
  const ch = await lib.getChapter(req.params.id);
  const edits = req.body.pages || []; // [{ idx, lines: [{ translation, edited }] }]
  for (const e of edits) {
    const page = ch.pages.find((p) => p.idx === e.idx);
    if (!page) continue;
    page.lines = page.lines.map((b, i) => {
      const next = e.lines?.[i];
      if (!next) return b; // preserve bbox/type/original/ai_translation/retries
      return { ...b, translation: next.translation, edited: !!next.edited };
    });
    const original = await storage.getOriginal(req.params.id, e.idx);
    const png = await renderPage(original, page.lines);
    await storage.putPage(req.params.id, e.idx, png);
    await lib.updatePageLines(req.params.id, e.idx, page.lines);
  }
  const metrics = await lib.recomputeMetrics(req.params.id);
  res.json({ ...(await lib.getChapter(req.params.id)), metrics });
}));

// Post-publish: "how much did you edit?" + optional what-felt-wrong.
app.post("/api/chapters/:id/feedback", requireAuth, wrap(async (req, res) => {
  if (!(await lib.isOwner(req.params.id, req.creator.id))) return res.status(404).json({ error: "not found or not yours" });
  await lib.saveFeedback(req.params.id, (req.body.bucket || "").slice(0, 16), (req.body.feltWrong || "").slice(0, 32));
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
