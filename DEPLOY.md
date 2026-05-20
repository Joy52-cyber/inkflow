# Deploying Inkflow

Inkflow deploys as a **single Railway service**: Express serves the built React
app, the `/api`, and sample assets. Uploaded page images go to **Cloudflare R2**
(persistent), the database is **Railway Postgres**.

```
Browser ──> Railway (Express) ──> Postgres (Railway)
                 │
                 └── uploaded pages ──> Cloudflare R2 (public URL)
```

## 1. Cloudflare R2 (page-image storage)

In the Cloudflare dashboard → **R2**:

1. **Create a bucket**, e.g. `inkflow-pages`.
2. Enable a public URL: bucket → **Settings → Public access → R2.dev subdomain**
   (or attach a custom domain). Copy the public base URL
   (looks like `https://pub-xxxxxxxx.r2.dev`).
3. **Create an API token**: R2 → **Manage API Tokens → Create** with
   *Object Read & Write* on that bucket. Copy the **Access Key ID** and
   **Secret Access Key**.
4. Your S3 endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   (Account ID is on the R2 overview page).

These map to env vars:

| Env var | Value |
|---|---|
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `S3_REGION` | `auto` |
| `S3_BUCKET` | `inkflow-pages` |
| `S3_ACCESS_KEY_ID` | (from token) |
| `S3_SECRET_ACCESS_KEY` | (from token) |
| `S3_PUBLIC_BASE_URL` | `https://pub-xxxxxxxx.r2.dev` |

When all five `S3_*` are set, the app switches from local disk to R2 automatically
(startup logs `storage: s3`).

## 2. Railway

Two ways — both build with `npm run build` and start with `npm start`
(`npm start` runs migrations, then the server).

**A. Connect GitHub (recommended, auto-deploy):**
1. Railway → New → **Deploy from GitHub repo** → `Joy52-cyber/inkflow`.
2. Add a **Postgres** plugin to the project (gives `DATABASE_URL`).
3. Set the env vars below on the service → Deploy.

**B. CLI:** `railway login` → `railway link` → `railway up`.

### Env vars to set on the Railway service

| Env var | Notes |
|---|---|
| `DATABASE_URL` | Use Railway's **internal** URL (`...railway.internal`) — reachable inside Railway |
| `PGSSL` | `true` |
| `JWT_SECRET` | long random string |
| `ANTHROPIC_API_KEY` | for localization |
| `LOCALIZE_MODEL` | `claude` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seeds the admin on boot (no `#` in the value) |
| `S3_*` (6 vars above) | from step 1 |
| `PORT` | Railway sets this automatically — do not hardcode |

Migrations run automatically on every deploy (idempotent). The admin account is
created/ensured from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Local development

```bash
npm install
cp .env.example .env   # fill ANTHROPIC_API_KEY, DATABASE_URL, JWT_SECRET, ADMIN_*
npm run migrate
npm run server         # API on :3001 (storage: local unless S3_* set)
npm run dev            # app on :5174
```
