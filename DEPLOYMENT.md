# IPTS — Vercel Deployment Guide

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free tier works)
- The project pushed to a **GitHub, GitLab, or Bitbucket** repository
- (Optional) A Google Gemini API key for AI features

---

## Step 1 — Push to Git

Make sure your code is in a Git repository and pushed to GitHub (or GitLab/Bitbucket):

```bash
git init
git add .
git commit -m "feat: Vercel deployment ready"
git remote add origin https://github.com/YOUR_USERNAME/ipts.git
git push -u origin main
```

> ⚠️ Ensure `.env` is listed in `.gitignore` (it is). Never commit real API keys.

---

## Step 2 — Import Project on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"** and select your repo
3. Vercel will auto-detect the `vercel.json` configuration

**Framework Preset**: Select **"Other"** (since `vercel.json` configures everything)

---

## Step 3 — Set Environment Variables

In the Vercel project dashboard → **Settings → Environment Variables**, add:

| Variable | Value | Required |
|----------|-------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | For AI features |
| `ANTHROPIC_API_KEY` | Your Anthropic Claude API key | Optional (fallback AI) |
| `APP_URL` | `https://your-project.vercel.app` | For QR codes & certs |

> Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com/app/apikey)

---

## Step 4 — Deploy

Click **"Deploy"**. Vercel will:
1. Run `npm run vercel-build` → `vite build` (builds the React SPA to `/dist`)
2. Deploy the `/dist` folder as static assets on Vercel's global CDN
3. Deploy `api/index.ts` as a serverless function handling all `/api/*` routes

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@mitcorer.edu.in` | `Admin@123` |
| Coordinator | `coordinator.cse@mitcorer.edu.in` | `Coord@123` |
| Student | `student1@mitcorer.edu.in` | `Student@123` |

---

## Architecture on Vercel

```
User Browser
    │
    ▼
Vercel Edge Network (Global CDN)
    │
    ├─── Static assets (/, /home, /login, etc.)
    │         └─ Served from /dist (Vite build output)
    │
    └─── /api/* requests
              └─ Routed to Serverless Function (api/index.ts)
                        └─ Express app (server.ts)
                                  └─ In-memory JSON store
                                     (seeded from defaults on cold start)
```

### ⚠️ Data Persistence Notice

The current deployment uses an **in-memory JSON store** seeded from default data on each cold start. This is suitable for **demos and showcases**. Data does not persist between serverless function invocations.

**For production with persistent data**, migrate to:
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (PostgreSQL)
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv) (Redis)
- [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier available)

---

## Local Development

Local development is unchanged — run as before:

```bash
npm install
npm run dev
```

The app runs on `http://localhost:3000` with Vite HMR and the full Express backend.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails with TypeScript errors | Run `npm run lint` locally first |
| AI features not working | Verify `GEMINI_API_KEY` is set in Vercel env vars |
| Routes return 404 on direct URL visit | The `vercel.json` rewrite rules handle SPA routing — ensure `vercel.json` is committed |
| API returns 500 | Check Vercel Function logs in the dashboard |
