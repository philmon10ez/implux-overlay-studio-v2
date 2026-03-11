# Implux — Shopify App (Remix)

Remix app for Shopify Admin; runs as **Railway Service 2** (same project as backend, separate service). Shares the same PostgreSQL database as the backend (`DATABASE_URL`).

## Setup

1. **Shopify Partner**: Create an app, get API key/secret. In `shopify.app.toml` set `client_id`, `application_url`, and replace `YOUR-RAILWAY-REMIX-SERVICE` / `YOUR-RAILWAY-BACKEND` with your Railway URLs.
2. **Railway**: New service from this folder. Set env: `DATABASE_URL`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `APP_URL` (this service URL), `FRONTEND_URL` (Vercel), optionally `THEME_EXTENSION_ID` for post-install theme editor redirect.
3. **orders/create webhook**: In `shopify.app.toml` the webhook `uri` points to the **backend** at `https://YOUR-RAILWAY-BACKEND.up.railway.app/proxy/conversion`. Shopify sends orders there; the backend verifies HMAC and records conversions.
4. **Theme extension**: After deploy, run `shopify app deploy` (or use CI) to push the `overlay-engine` theme extension. In `extensions/overlay-engine/assets/overlay-engine.js` set `PROXY_URL` to your backend (e.g. `https://your-backend.up.railway.app/proxy`). For HMAC-verified proxy requests from the storefront, configure a **Shopify App Proxy** in the Partner Dashboard pointing to that backend URL, and use the app proxy base URL in the script instead.

## Build & start (Railway)

- Build: `npm run build`
- Start: `npm run start` (serves `./build/server/index.js`)

## Post-install redirect

If `THEME_EXTENSION_ID` is set, after OAuth the merchant is redirected to the theme editor to activate the App Embed:  
`https://{shop}/admin/themes/current/editor?context=apps&activateAppId={THEME_EXTENSION_ID}`

## Extension: overlay-engine

- `extensions/overlay-engine/blocks/app-embed.liquid` — loads `overlay-engine.js` on the storefront.
- `extensions/overlay-engine/assets/overlay-engine.js` — IIFE: fetches active campaigns from proxy, runs triggers (exit intent, time delay, scroll depth), shows overlay, sends impression/click to proxy.

Replace `YOUR-RAILWAY-BACKEND` in `overlay-engine.js` with your backend host before deploy.
