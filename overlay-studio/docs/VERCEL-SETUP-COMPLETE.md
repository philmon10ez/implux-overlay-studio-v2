# Vercel setup — complete checklist for admin.implux.io

Use this when connecting the repo to Vercel so the full system (dashboard + API + Shopify) works.

---

## 1. Project settings

| Setting | Value |
|--------|--------|
| **Root Directory** | `frontend` (if repo root is `overlay-studio`) or `overlay-studio/frontend` (if repo root is parent) |
| **Framework Preset** | Vite (auto-detected) |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `dist` (default) |
| **Install Command** | `npm install` (default) |

`vercel.json` in the frontend folder already sets rewrites for SPA routing; no change needed unless you use a different root.

---

## 2. Environment variables (required)

In Vercel: **Project → Settings → Environment Variables**. Add:

| Name | Value | Environment |
|------|--------|-------------|
| **VITE_API_URL** | `https://api.implux.io` | Production, Preview (optional) |

- **No trailing slash.**
- This is the backend the dashboard calls for campaigns, merchants, auth, analytics.
- If you omit it, the app falls back to `https://api.implux.io` in production builds only; setting it explicitly is recommended.

---

## 3. Environment variables (optional — Campaigns quick links)

| Name | Value | Environment |
|------|--------|-------------|
| **VITE_SHOPIFY_DEV_STORE** | `your-dev-store.myshopify.com` | Production (optional) |
| **VITE_SHOPIFY_THEME_EXTENSION_ID** | `gid://shopify/ThemeAppExtension/...` | Production (optional) |

Only needed if you want “Open theme editor” and “Open storefront” buttons on the Campaigns tab. Same value as Railway `THEME_EXTENSION_ID` for your app.

---

## 4. Custom domain

1. **Vercel → Project → Settings → Domains**
2. **Add** → `admin.implux.io`
3. In your DNS (where implux.io is managed), add the record Vercel shows (e.g. CNAME `admin.implux.io` → `cname.vercel-dns.com`).
4. Wait for SSL to be ready.

---

## 5. After changing env vars

- **Redeploy** (Deployments → ⋮ on latest → Redeploy, or push a new commit).
- Env vars are baked in at **build time**; a new deployment is required for changes to take effect.

---

## 6. Quick copy-paste (Production only)

```
VITE_API_URL=https://api.implux.io
```

Optional:

```
VITE_SHOPIFY_DEV_STORE=your-store.myshopify.com
VITE_SHOPIFY_THEME_EXTENSION_ID=gid://shopify/ThemeAppExtension/123456789
```

---

## Result

- **https://admin.implux.io** → Implux dashboard (Campaigns, Merchants, Analytics).
- Dashboard talks to **https://api.implux.io** (Railway backend).
- Works for your dev store and any Shopify store: create campaigns per merchant; merchants are synced when stores install your Shopify app (Railway config).

No other Vercel changes are required for the system to be complete.
