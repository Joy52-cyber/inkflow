// Page-image storage abstraction. Two drivers, chosen by env:
//   local (default): writes to public/pages/uploads, served by Vite/static.
//   s3:    S3-compatible object storage (Cloudflare R2, AWS S3, etc.).
// The DB stores whatever URL putPage returns, so the reader is driver-agnostic.
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCAL_ROOT = join(__dirname, "..", "public", "pages", "uploads");

const USE_S3 = !!(
  process.env.S3_BUCKET &&
  process.env.S3_ENDPOINT &&
  process.env.S3_ACCESS_KEY_ID &&
  process.env.S3_SECRET_ACCESS_KEY
);

export const STORAGE_DRIVER = USE_S3 ? "s3" : "local";

const keyFor = (chapterId, idx) => `pages/uploads/${chapterId}/p${idx + 1}.png`;

let _client = null;
async function s3client() {
  if (!_client) {
    const { S3Client } = await import("@aws-sdk/client-s3");
    _client = new S3Client({
      region: process.env.S3_REGION || "auto", // R2 uses "auto"
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

// Store one page PNG; returns the URL to save in pages.image_path.
export async function putPage(chapterId, idx, buffer) {
  const key = keyFor(chapterId, idx);
  if (USE_S3) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3client();
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: "image/png",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    const base = (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    return `${base}/${key}`;
  }
  const file = join(LOCAL_ROOT, chapterId, `p${idx + 1}.png`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, buffer);
  return `/${key}`; // Vite serves /public at the web root
}

// Remove all page images for a chapter.
export async function deleteChapter(chapterId) {
  if (USE_S3) {
    const { ListObjectsV2Command, DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
    const client = await s3client();
    const prefix = `pages/uploads/${chapterId}/`;
    const listed = await client.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET, Prefix: prefix }));
    const objects = (listed.Contents || []).map((o) => ({ Key: o.Key }));
    if (objects.length) {
      await client.send(new DeleteObjectsCommand({ Bucket: process.env.S3_BUCKET, Delete: { Objects: objects } }));
    }
    return;
  }
  await rm(join(LOCAL_ROOT, chapterId), { recursive: true, force: true }).catch(() => {});
}
