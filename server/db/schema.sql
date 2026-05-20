-- Inkflow Phase 2 schema. Creators upload series; chapters carry both a
-- publish state (draft/published) and a moderation state (pending/approved/rejected).
-- Publicly visible = published AND approved.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

CREATE TABLE IF NOT EXISTS creators (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'creator',  -- 'creator' | 'admin'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS series (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  genre       TEXT NOT NULL,                       -- 'cooking' | 'action'
  accent      TEXT NOT NULL DEFAULT '#06b6d4',
  synopsis    TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chapters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id     UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  number        INT  NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'draft',     -- 'draft' | 'published'
  review_status TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'approved' | 'rejected'
  review_note   TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id  UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  idx         INT  NOT NULL,                        -- 0-based page order
  image_path  TEXT NOT NULL,
  lines       JSONB NOT NULL DEFAULT '[]'           -- localization: original/translation/type
);

CREATE INDEX IF NOT EXISTS idx_series_creator   ON series(creator_id);
CREATE INDEX IF NOT EXISTS idx_chapters_series  ON chapters(series_id);
CREATE INDEX IF NOT EXISTS idx_chapters_state   ON chapters(status, review_status);
CREATE INDEX IF NOT EXISTS idx_pages_chapter    ON pages(chapter_id, idx);
