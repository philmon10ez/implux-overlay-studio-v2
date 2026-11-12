# Shopify security release plan

Production app: Poptek by Implux. Client id `bfcae2d7ecd83eb4fc96749fb543380c`. API `https://api.implux.io`. Do not publish this plan automatically.

## App proxy

| | URL | Subpath |
| --- | --- | --- |
| Production | `https://api.implux.io/proxy` | `/apps/poptek` |
| Staging | `https://implux-overlay-studio-v2-staging.up.railway.app/proxy` | `/apps/poptek` |

The theme calls a relative `/apps/poptek` only when the embed sets `appProxyPath`. Until this extension version is published, live stores keep calling the absolute production proxy baked into the current asset. That path stays valid while `STOREFRONT_AUTH_MODE` is `compat` (the default). An invalid signature is always rejected. `strict` rejects missing signatures and must stay off in production until the new embed is on a store and a signed request succeeds.

`shopify app deploy` is a separate step. A git push does not change the Partner Dashboard app proxy or scopes.

## Scopes

Requested scopes are now `read_orders,read_themes`.

Removed after code review: `write_script_tags`, `write_themes`, `read_products`. No Admin API call writes a script tag or theme, and product data is entered in the dashboard rather than read from Shopify. `read_themes` remains because onboarding reads theme files to detect the embed. `read_orders` remains because order conversion is an `orders/create` webhook contract.

Railway `SCOPES`, if set to the old list, overrides the code default. Remove that override when the new version is published.

Existing installs keep their old grants until the merchant opens the app and approves the updated access screen. Reauthorization is required for the scope change to take effect. It does not, by itself, uninstall the app or delete campaigns.

## Theme package

- `extensions/overlay-engine/locales/en.default.json` exists.
- Tests live under `shopify-app/storefront/`, not in the extension assets.
- Production asset proxy remains `https://api.implux.io/proxy`. The staging host must not appear in that file. The unit test checks this.
- Sanitizers are injected into the asset by `scripts/sync-overlay-engine-storefront.mjs`.

## Privacy

`customers/data_request`, `customers/redact`, `shop/redact`, and `app/uninstalled` verify HMAC, ignore duplicate webhook ids, and only touch the shop in the header. Shop redact deletes that shop's campaigns, events, products, recommendation sets, sessions, and overlay submissions, and blanks the access token. Customer redact clears order id and order value on matching events only. The data request returns an order-id inventory to the caller and does not log email or phone.

Legal review still required: whether retaining order ids after a customer redact, and how long webhook delivery rows are kept (30 days in code), matches the privacy policy.

## Release coupling

1. Deploy the backend with `STOREFRONT_AUTH_MODE` unset or `compat`.
2. Confirm `POST /proxy/track` and unsigned `GET /proxy/campaigns` still work for the current theme.
3. Publish the Shopify app version with the app proxy and the reduced scopes.
4. Publish the theme extension.
5. On a development store, confirm the embed calls `/apps/poptek` and the signature verifies.
6. Only then set `STOREFRONT_AUTH_MODE=strict` on production.

Reversing step 6 without republishing the old theme returns live overlays to compat behavior. Reversing step 3 requires another Partner Dashboard release.
