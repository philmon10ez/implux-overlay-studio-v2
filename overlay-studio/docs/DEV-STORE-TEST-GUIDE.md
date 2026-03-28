# Test Implux on a Shopify development store

Follow these steps once per environment (Railway + Vercel + Partner Dashboard).

## 1. One-time: enable merchant auto-sync

When a merchant installs your Shopify app, their store is **automatically** added/updated in Implux (no manual access token).

**Railway → Backend service → Variables**

| Name | Value |
|------|--------|
| `MERCHANT_SYNC_SECRET` | Long random string (e.g. `openssl rand -hex 32`). **Same value** on both backend and shopify-app. |

**Railway → Shopify app service → Variables**

| Name | Value |
|------|--------|
| `MERCHANT_SYNC_SECRET` | Same secret as on the backend |
| `IMPLUX_BACKEND_URL` | Backend public URL, e.g. `https://api.implux.io` (no trailing slash) |

Redeploy both services after saving.

---

## 2. Deploy the theme extension (app embed)

On your machine (Shopify CLI installed):

```bash
cd overlay-studio/shopify-app
shopify app config link
shopify app deploy
```

Copy **Theme app extension ID** from Partner Dashboard → your app → **Extensions** → overlay-engine. Set on Railway shopify-app:

`THEME_EXTENSION_ID=gid://shopify/ThemeAppExtension/...`

Redeploy shopify-app. After install, merchants are redirected to the theme editor to turn on the embed.

---

## 3. Config that must match production

| Item | Where |
|------|--------|
| `shopify.app.toml` + Partner Dashboard | App URL, redirects, webhooks |
| `overlay-engine.js` → `PROXY_URL` | Must be `https://YOUR-BACKEND/proxy` (e.g. `https://api.implux.io/proxy`) |
| Backend | `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET`, `FRONTEND_URL=https://admin.implux.io` |
| Vercel frontend | `VITE_API_URL=https://api.implux.io` |
| Shopify app | `FRONTEND_URL=https://admin.implux.io` |

---

## 4. Install on your dev store

1. **Shopify Partners** → **Apps** → your app → **Test on development store** (or **Select store**).
2. Complete OAuth. Your dev store should appear under **Merchants** in the Implux API (and in campaign merchant dropdown).
3. If prompted, **Themes → Customize → App embeds** → enable **Implux / overlay-engine**.
4. Or open **Online Store → Themes → Customize → App embeds** and enable the embed.

---

## 5. Create a campaign from admin.implux.io

1. Open **https://admin.implux.io** → log in.
2. Go to **Campaigns** → **New Campaign**.
3. Choose your **dev store** as the merchant (should appear after step 4).
4. Configure trigger + design → **Publish Campaign** (status must be **active**).
5. Visit your **storefront** URL (e.g. `https://your-store.myshopify.com` or your preview domain). You should see the overlay after the trigger fires.

---

## 6. Campaigns tab quick actions (optional)

In Vercel, set:

- `VITE_SHOPIFY_DEV_STORE=your-store.myshopify.com`
- `VITE_SHOPIFY_THEME_EXTENSION_ID=gid://shopify/ThemeAppExtension/...` (same as `THEME_EXTENSION_ID`)

Redeploy. The **Campaigns** page will show buttons to open the theme editor (enable embed) and your storefront.

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| No merchant after install | Backend logs; `MERCHANT_SYNC_SECRET` matches; `IMPLUX_BACKEND_URL` reachable from Railway shopify-app |
| Overlay never shows | App embed enabled; campaign **active**; correct merchant; `PROXY_URL` in deployed extension |
| 401 on proxy | Merchant `accessToken` valid; reinstall app to refresh token |
