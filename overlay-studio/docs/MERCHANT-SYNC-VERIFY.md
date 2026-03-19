# Merchant sync — verify before/after push

Use this to confirm env and backend are correct so liberty&cross (and any store) appears in Merchants.

---

## 1. Backend: sync route must be deployed

The **implux-overlay-studio** (backend) service must have the sync route. If you never pushed/deployed the backend with `shopifySync.js`, the Shopify app gets **404** and the merchant never syncs.

**Check:** From your machine (PowerShell):

```powershell
# Should get 400 "shop and accessToken required" (proves route exists), NOT 404
Invoke-WebRequest -Uri "https://api.implux.io/api/shopify/sync-merchant" -Method POST -ContentType "application/json" -Body "{}" -UseBasicParsing | Select-Object StatusCode, Content
```

- **404** → Backend doesn’t have the route. Push `backend/routes/shopifySync.js` and `backend/server.js` (with `app.use('/api/shopify', shopifySyncRoutes)`) and redeploy **implux-overlay-studio**.
- **401** → Route exists; secret missing or wrong (see step 2).
- **400** with body like `shop and accessToken required` → Route works. Sync will work when the app sends the right body and header.

---

## 2. Variables: exact names and where

| Variable | Where | Must be |
|----------|--------|--------|
| **MERCHANT_SYNC_SECRET** | **stunning-friendship** (Shopify app) | Same value as backend. No spaces before/after. |
| **MERCHANT_SYNC_SECRET** | **implux-overlay-studio** (backend) | Same value as Shopify app. No spaces. |
| **IMPLUX_BACKEND_URL** | **stunning-friendship** only | `https://api.implux.io` (no trailing slash). Not admin.implux.io. |

**Typo check:**  
- Not `MERCHANT_SYNC_SECRETS`, `SYNC_SECRET`, or `MERCHANT_SYNC_KEY`.  
- Not `IMPLUX_API_URL` or `BACKEND_URL` (we use `IMPLUX_BACKEND_URL` or `BACKEND_API_URL`).

**Easiest fix for “same result”:**  
1. Generate a new secret: `openssl rand -hex 32`  
2. Set that **exact** string as **MERCHANT_SYNC_SECRET** on **both** Railway services (copy‑paste, no spaces).  
3. Redeploy **both** services.

---

## 3. Backend receives the request

After opening the Implux app in the store:

- **implux-overlay-studio** → **Deploy Logs** (not Build Logs):
  - `[Implux] Merchant synced: liberty-cross.myshopify.com` → success.
  - `[Implux] sync-merchant: 401 secret mismatch` → fix step 2.
  - `[Implux] sync-merchant: 503 MERCHANT_SYNC_SECRET not set` → set MERCHANT_SYNC_SECRET on backend and redeploy.
  - No log at all → request never reached backend (404, network, or wrong IMPLUX_BACKEND_URL).

---

## 4. Shopify app sends the request

**stunning-friendship** → **Deploy Logs** (right after opening the app):

- `[Implux] Merchant sync on app load OK for liberty-cross.myshopify.com` → sync ran.
- `[Implux] Merchant sync on app load failed: 401` → backend rejected (secret mismatch).
- `[Implux] Merchant sync on app load failed: 404` → backend route not deployed (step 1).
- `[Implux] Merchant sync on app load skipped (no token): ...` → token fallback should help after your next push; if it still skips, check Session table has a row for that shop.
- `[Implux] Merchant sync on app load error: ...` → network/DNS (e.g. wrong IMPLUX_BACKEND_URL or backend down).

---

## 5. Quick copy‑paste (Railway)

**stunning-friendship:**  
`IMPLUX_BACKEND_URL` = `https://api.implux.io`  
`MERCHANT_SYNC_SECRET` = (same as below)

**implux-overlay-studio:**  
`MERCHANT_SYNC_SECRET` = (same as above)

Then redeploy both.

---

## Summary

1. Confirm backend returns 400 (not 404) for POST `/api/shopify/sync-merchant`.  
2. Use exact variable names; set a fresh MERCHANT_SYNC_SECRET on both services and redeploy.  
3. After opening the app, check backend and Shopify app Deploy Logs for the messages above.
