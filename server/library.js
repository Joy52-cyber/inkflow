// Data access for creator works. A chapter has two independent states:
//   status: draft | published         (creator controls)
//   review_status: pending | approved | rejected   (admin controls)
// Public visibility requires status='published' AND review_status='approved'.
import { pool, one, query } from "./db/pool.js";

const ACCENTS = { cooking: "#f59e0b", action: "#06b6d4" };

// Create series + chapter (draft/pending) + pages in one transaction.
// `localizedPages` = [{ buffer-written already? no }] — caller writes images, passes paths.
export async function createChapter({ creatorId, title, genre, chapterId, pagesData, totalBubbles = 0 }) {
  const g = ACCENTS[genre] ? genre : "action";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const series = (
      await client.query(
        `INSERT INTO series (creator_id, title, genre, accent) VALUES ($1,$2,$3,$4) RETURNING id`,
        [creatorId, title, g, ACCENTS[g]]
      )
    ).rows[0];
    const chapter = (
      await client.query(
        `INSERT INTO chapters (id, series_id, title, number, total_bubbles)
         VALUES ($1,$2,$3,1,$4) RETURNING id`,
        [chapterId, series.id, title, totalBubbles]
      )
    ).rows[0];
    for (const p of pagesData) {
      await client.query(
        `INSERT INTO pages (chapter_id, idx, image_path, original_path, lines) VALUES ($1,$2,$3,$4,$5)`,
        [chapter.id, p.idx, p.image_path, p.original_path || null, JSON.stringify(p.lines)]
      );
    }
    await client.query("COMMIT");
    return chapter.id;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

const CHAPTER_SELECT = `
  SELECT c.id, c.title, c.number, c.status, c.review_status, c.review_note,
         c.views, c.created_at, c.published_at,
         c.total_bubbles, c.edited_bubbles, c.retry_count, c.edit_bucket,
         s.id AS series_id, s.title AS series_title, s.genre, s.accent,
         s.creator_id, cr.display_name AS creator_name,
         (cr.email LIKE '%@inkflow.demo') AS demo
  FROM chapters c
  JOIN series s ON s.id = c.series_id
  JOIN creators cr ON cr.id = s.creator_id`;

async function withPages(chapter) {
  if (!chapter) return null;
  const { rows } = await query(
    "SELECT idx, image_path AS src, original_path, lines FROM pages WHERE chapter_id=$1 ORDER BY idx",
    [chapter.id]
  );
  return { ...chapter, pageCount: rows.length, pages: rows };
}

export async function getChapter(id) {
  return withPages(await one(`${CHAPTER_SELECT} WHERE c.id=$1`, [id]));
}

export async function publishChapter(id, creatorId) {
  return one(
    `UPDATE chapters c SET status='published', published_at=now()
     FROM series s WHERE c.series_id=s.id AND c.id=$1 AND s.creator_id=$2
     RETURNING c.id`,
    [id, creatorId]
  );
}

export async function deleteChapter(id, creatorId) {
  return one(
    `DELETE FROM chapters c USING series s
     WHERE c.series_id=s.id AND c.id=$1 AND s.creator_id=$2 RETURNING c.id`,
    [id, creatorId]
  );
}

// Public library: only published + approved.
export async function listPublic() {
  const { rows } = await query(
    `${CHAPTER_SELECT}
     WHERE c.status='published' AND c.review_status='approved'
     ORDER BY c.published_at DESC NULLS LAST, c.created_at DESC`
  );
  return rows;
}

// A creator's own works, any state.
export async function listMine(creatorId) {
  const { rows } = await query(
    `${CHAPTER_SELECT} WHERE s.creator_id=$1 ORDER BY c.created_at DESC`,
    [creatorId]
  );
  return rows;
}

// Admin moderation queue: submitted (published) but not yet decided.
export async function adminQueue() {
  const { rows } = await query(
    `${CHAPTER_SELECT}
     WHERE c.status='published' AND c.review_status='pending'
     ORDER BY c.published_at ASC`
  );
  return rows;
}

export async function reviewChapter(id, decision, note = "") {
  const review_status = decision === "approve" ? "approved" : "rejected";
  return one(
    `UPDATE chapters SET review_status=$2, review_note=$3 WHERE id=$1 RETURNING id, review_status`,
    [id, review_status, note]
  );
}

// --- Phase 3: discovery ---

// Count a read (only matters for live chapters). Fire-and-forget from the route.
export async function incrementViews(id) {
  await query(
    `UPDATE chapters SET views = views + 1
     WHERE id=$1 AND status='published' AND review_status='approved'`,
    [id]
  );
}

// Most-viewed live chapters.
export async function trending(limit = 12) {
  const { rows } = await query(
    `${CHAPTER_SELECT}
     WHERE c.status='published' AND c.review_status='approved'
     ORDER BY c.views DESC, c.published_at DESC NULLS LAST
     LIMIT $1`,
    [limit]
  );
  return rows;
}

// Search live works by series title or creator name (case-insensitive).
export async function search(q, limit = 40) {
  const term = `%${(q || "").trim()}%`;
  const { rows } = await query(
    `${CHAPTER_SELECT}
     WHERE c.status='published' AND c.review_status='approved'
       AND (s.title ILIKE $1 OR cr.display_name ILIKE $1)
     ORDER BY c.views DESC, c.published_at DESC NULLS LAST
     LIMIT $2`,
    [term, limit]
  );
  return rows;
}

// Public creator profile + their live works.
// --- Localization Quality v1: ownership + edit persistence ---

export async function isOwner(chapterId, creatorId) {
  const row = await one(
    `SELECT 1 FROM chapters c JOIN series s ON s.id=c.series_id
     WHERE c.id=$1 AND s.creator_id=$2`,
    [chapterId, creatorId]
  );
  return !!row;
}

export async function updatePageLines(chapterId, idx, lines) {
  await query("UPDATE pages SET lines=$3 WHERE chapter_id=$1 AND idx=$2", [chapterId, idx, JSON.stringify(lines)]);
}

// Recompute edit metrics across all pages from the per-bubble flags.
export async function recomputeMetrics(chapterId) {
  const { rows } = await query("SELECT lines FROM pages WHERE chapter_id=$1", [chapterId]);
  let total = 0, edited = 0, retries = 0;
  for (const r of rows) {
    for (const b of r.lines || []) {
      total++;
      if (b.edited) edited++;
      retries += b.retries || 0;
    }
  }
  await query(
    "UPDATE chapters SET total_bubbles=$2, edited_bubbles=$3, retry_count=$4 WHERE id=$1",
    [chapterId, total, edited, retries]
  );
  return { total, edited, retries, edit_rate: total ? edited / total : 0 };
}

export async function saveFeedback(chapterId, bucket, feltWrong = "") {
  await query("UPDATE chapters SET edit_bucket=$2, felt_wrong=$3 WHERE id=$1", [chapterId, bucket, feltWrong]);
}

export async function getCreatorProfile(id) {
  const creator = await one(
    `SELECT id, display_name, created_at FROM creators WHERE id=$1`,
    [id]
  );
  if (!creator) return null;
  const { rows } = await query(
    `${CHAPTER_SELECT}
     WHERE s.creator_id=$1 AND c.status='published' AND c.review_status='approved'
     ORDER BY c.published_at DESC NULLS LAST`,
    [id]
  );
  return { creator, works: rows };
}
