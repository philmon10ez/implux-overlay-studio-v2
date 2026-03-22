# `oauth_error=same_site_cookies` — refresh loop / “app couldn’t be loaded”

## What it means

The embedded app runs inside an **iframe** on `admin.shopify.com`. The **legacy OAuth** flow relies on cookies in that cross-site context. Browsers (Chrome, Brave, strict privacy) often **block** those cookies → Shopify shows **`oauth_error=same_site_cookies`**, a **refresh loop**, then “couldn’t be loaded.”

## Code fix (repo)

`shopify.server.js` enables:

- `future.unstable_newEmbeddedAuthStrategy: true` — uses **token exchange** instead of cookie-heavy OAuth redirects in the iframe.

Deploy **stunning-friendship** after pushing.

## Shopify: managed installation

Shopify recommends **managed installation** with this flag:

- [Shopify managed installation](https://shopify.dev/docs/apps/auth/installation#shopify-managed-installation)
- From `shopify-app` folder, keep `shopify.app.toml` in sync and run:  
  `shopify app deploy`  
  so Partner/Dev Dashboard picks up scopes and install behavior.

## Browser (still do this)

1. **Turn off AdBlock / uBlock / Brave shields** for `*.shopify.com` (they block `monorail` / analytics and can break admin).
2. **Allow third-party cookies** for Shopify (Chrome: Settings → Privacy → third-party cookies — at least for testing).
3. Try **Chrome guest window** or **Incognito with extensions disabled**.

## If it still loops

1. **Uninstall** Implux from the dev store, then **install again** after the new deploy.
2. **Railway Deploy Logs** on `GET /auth` or `/app` for errors.
3. **Shopify Partner Support** — reference `same_site_cookies` + embedded app.
