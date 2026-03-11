# Implux.io — Deployment & Development Guide

This document covers local development for all three services, Railway deployment (backend + Shopify app), Vercel deployment (frontend), database setup with **Supabase** (or any PostgreSQL), and how to obtain API credentials.

---

## 1. Local development setup

### Prerequisites

- Node.js 20+
- **Database:** Supabase (recommended) or any PostgreSQL (local or cloud)
- Shopify Partner account (for Shopify app)
- (Optional) Rakuten Advertising publisher account

### Backend (`/backend`)

1. Copy environment variables:
   ```bash
   cd backend
   cp .env.example .env
   ```
2. Edit `.env`: set `DATABASE_URL` to your database connection string (see **Database: Using Supabase** below for Supabase, or e.g. `postgresql://user:pass@localhost:5432/overlay_studio` for local Postgres).
3. Install dependencies and run migrations:
   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   ```
4. Start the server:
   ```bash
   npm run dev
   ```
   Backend runs at **http://localhost:3001** (or the `PORT` in `.env`).

### Frontend (`/frontend`)

1. Copy environment variables:
   ```bash
   cd frontend
   cp .env.example .env
   ```
2. Edit `.env`: set `VITE_API_URL=http://localhost:3001` (your local backend URL).
3. Install and run:
   ```bash
   npm install
   npm run dev
   ```
   Frontend runs at **http://localhost:5173**. The Vite dev server proxies `/api` and `/proxy` to `VITE_API_URL`, so API and cookie auth work against the local backend.

### Shopify App (`/shopify-app`)

1. Copy environment variables:
   ```bash
   cd shopify-app
   cp .env.example .env
   ```
2. Edit `.env`:
   - `DATABASE_URL` — same PostgreSQL as backend (can use same DB; Session table is separate).
   - `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` — from Shopify Partner Dashboard (see section 6).
   - `APP_URL` — your tunnel URL for local dev (e.g. from `shopify app dev` or ngrok).
   - `SCOPES` — e.g. `read_products,write_script_tags,read_orders,write_themes,read_themes`.
3. Run Prisma (Session table):
   ```bash
   npm install
   npx prisma generate
   npx prisma migrate deploy
   ```
4. Start the app (requires Shopify CLI login):
   ```bash
   npm run dev
   ```
   Or use `shopify app dev` to get a tunnel and run the Remix app; the CLI will prompt for login and open a tunnel.

---

## 2. Database: Using Supabase

Implux uses **PostgreSQL**. You can host it on [Supabase](https://supabase.com) (recommended) instead of Railway Postgres.

### Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign in.
2. **New project** → choose org, name (e.g. `overlay-studio`), database password, region.
3. Wait for the project to be ready.

### Get the connection string

1. In the Supabase dashboard: **Project Settings** (gear) → **Database**.
2. Under **Connection string**, select **URI**.
3. Copy the URI. It looks like:
   ```text
   postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```
   Replace `[YOUR-PASSWORD]` with your database password.
4. **For Prisma (migrations and long-running apps):** use the **direct** connection on port **5432** (Session mode). If Supabase shows a “Direct connection” or “Session” URI, use that. Otherwise the pooled URI on port 5432 is fine for Railway/Node.
5. Add `?sslmode=require` if your URI does not already include it (Supabase requires SSL).

**Example (Supabase-style):**
```text
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require"
```

### Use the same database for backend and Shopify app

- **Backend:** set `DATABASE_URL` in `.env` (local) or in the Railway backend service (production).
- **Shopify app:** set the **same** `DATABASE_URL` in `.env` (local) or in the Railway Shopify app service (production).

### Run migrations

- **Backend tables** (User, Merchant, Campaign, etc.): from `/backend` run `npm run db:migrate`, then `npm run db:seed` if you want the default admin user.
- **Shopify Session table:** from `/shopify-app` run `npx prisma migrate deploy`.

Supabase is standard PostgreSQL, so no code changes are required; only `DATABASE_URL` needs to point to your Supabase connection string.

---

## 3. Railway deployment (backend + Shopify app)

### One-time setup

1. **Create a Railway project**  
   [railway.app](https://railway.app) → New Project.

2. **Database (choose one)**  
   - **Option A — Supabase:** Create a Supabase project (see **Database: Using Supabase** above). You will set `DATABASE_URL` manually in both Railway services.  
   - **Option B — Railway Postgres:** In the project: **Add Service** → **Database** → **PostgreSQL**. Railway sets `DATABASE_URL` when you link the plugin to a service.

3. **Add the Backend service**  
   - **Add Service** → **GitHub Repo** (or deploy from CLI).  
   - Set **Root Directory** to `backend`.  
   - Railway will use `railway.json` and the **Procfile** (`web: node server.js`).  
   - Build: Nixpacks (default).  
   - Start: `node server.js`.  
   - If using Supabase, add `DATABASE_URL` (your Supabase connection string) in the service variables. If using Railway Postgres, link the Postgres plugin to this service.

4. **Add the Shopify App service**  
   - **Add Service** → same repo.  
   - Set **Root Directory** to `shopify-app`.  
   - Build: Nixpacks.  
   - Start: `npm run start` (from `railway.json`).  
   - If using Supabase, add the same `DATABASE_URL`. If using Railway Postgres, link the same Postgres plugin.

### Environment variables

**Backend service**

| Variable | Required | Notes |
|---------|----------|--------|
| `DATABASE_URL` | Yes | Supabase connection string, or auto-set if you link Railway Postgres. |
| `JWT_SECRET` | Yes | Strong random string for JWT signing. |
| `FRONTEND_URL` | Yes | Vercel frontend URL (e.g. `https://overlay-studio.vercel.app`). |
| `SHOPIFY_API_KEY` | Yes | From Shopify Partner app. |
| `SHOPIFY_API_SECRET` | Yes | From Shopify Partner app. |
| `PROXY_HMAC_SECRET` | Yes | Secret for app proxy / webhook HMAC verification. |
| `RAKUTEN_CLIENT_ID` | Optional | Rakuten API (see section 5). |
| `RAKUTEN_CLIENT_SECRET` | Optional | |
| `RAKUTEN_PUBLISHER_ID` | Optional | |
| `RAKUTEN_SECURITY_TOKEN` | Optional | |
| `PORT` | No | Set automatically by Railway. |

**Shopify App service**

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Same as backend — same Supabase URI or link same Railway Postgres. |
| `SHOPIFY_API_KEY` | Yes | Same app as backend. |
| `SHOPIFY_API_SECRET` | Yes | |
| `APP_URL` | Yes | This service’s public URL (e.g. `https://overlay-studio-shopify.up.railway.app`). |
| `SCOPES` | Yes | `read_products,write_script_tags,read_orders,write_themes,read_themes` |

Optional: `FRONTEND_URL` (for “Open Dashboard” link), `THEME_EXTENSION_ID` (for post-install theme editor redirect).

### Deploy

- Push to the connected branch; Railway will build and deploy each service from its root directory.
- Or use **Railway CLI**: `railway up` from `backend` or `shopify-app` with the correct service selected.

---

## 4. Vercel deployment (frontend)

1. **Connect the repo**  
   [vercel.com](https://vercel.com) → Add New Project → Import your Git repository.

2. **Set root directory**  
   In project settings, set **Root Directory** to `frontend` (so build runs from `/frontend`).

3. **Build settings**  
   - Framework: Vite (auto-detected).  
   - Build command: `npm run build`.  
   - Output directory: `dist`.

4. **Environment variable**  
   Add:
   - **Name:** `VITE_API_URL`  
   - **Value:** Your Railway backend URL (e.g. `https://overlay-studio-backend.up.railway.app`).  
   No trailing slash.

5. **Deploy**  
   Save and deploy. The app is a SPA; `vercel.json` rewrites all routes to `/index.html`.

---

## 5. Shopify CLI — deploy theme extension

From the **shopify-app** directory (or repo root with correct config):

1. Log in and link the app (if not already):
   ```bash
   cd shopify-app
   shopify app config link
   ```

2. Deploy the app (including the theme app extension):
   ```bash
   shopify app deploy
   ```

This deploys the **overlay-engine** theme app extension so merchants can enable the “Overlay Studio” app embed in the theme editor.

Before that, ensure:

- `shopify.app.toml` has the correct `application_url` (your Railway Shopify app URL).
- In `extensions/overlay-engine/assets/overlay-engine.js`, `PROXY_URL` is set to your Railway **backend** URL (e.g. `https://your-backend.up.railway.app/proxy`).

---

## 6. Rakuten API credentials

1. Go to **publisher.rakutenadvertising.com** and sign in.
2. Open **Support** (or **Help**) → **Manage Tokens** (or equivalent for API credentials).
3. Create or copy:
   - **Client ID**
   - **Client Secret**
   - **Publisher ID** (your publisher/account ID)
   - **Security Token** (if used for your integration)

Add these to the **Railway Backend** service as:

- `RAKUTEN_CLIENT_ID`
- `RAKUTEN_CLIENT_SECRET`
- `RAKUTEN_PUBLISHER_ID`
- `RAKUTEN_SECURITY_TOKEN`

Then use **Connect & Test** in the Implux dashboard (Rakuten page) to save and verify.

---

## 7. Shopify API credentials

1. Go to **partners.shopify.com** and sign in.
2. **Apps** → **Create app** → **Create app manually** (or use an existing app).
3. Open the app → **Configuration** (or **App setup**).
4. Under **Client credentials** you’ll see:
   - **Client ID** → use as `SHOPIFY_API_KEY`
   - **Client secret** → use as `SHOPIFY_API_SECRET`

Use the same values in:

- **Railway Backend** (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`) for webhook verification and proxy.
- **Railway Shopify App** (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`) for OAuth and Admin API.

Set **App URL** (and allowed redirection URLs) to your Railway Shopify app URL (e.g. `https://overlay-studio-shopify.up.railway.app`).

---

## Quick reference

| Service | Local | Production |
|--------|--------|------------|
| Backend | `cd backend && npm run dev` (port 3001) | Railway, root `backend` |
| Frontend | `cd frontend && npm run dev` (port 5173) | Vercel, root `frontend` |
| Shopify App | `cd shopify-app && npm run dev` | Railway, root `shopify-app` |

- **Backend** and **Shopify app** share the same PostgreSQL database (`DATABASE_URL`). Use **Supabase** or Railway Postgres; see **Database: Using Supabase** for Supabase setup. Implux.io is the product name.
- **Frontend** talks to the backend via `VITE_API_URL` (production) or Vite proxy (local).
- **orders/create** webhook is sent by Shopify to the **backend** `/proxy/conversion` URL configured in `shopify.app.toml`.
