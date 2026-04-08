# Recommendations, previews, frequency caps & conversion intelligence

Short reference for the recommendation-set feature set in **Overlay Studio** (admin) and how it connects to the storefront.

## What was added

- **Recommendation sets** — Per-merchant sets of products with placement (`product_page`, `cart`, `checkout`), JSON trigger rules, optional frequency caps, preset metadata, draft/active status, and ordered product links.
- **Products** — Lightweight merchant catalog for attaching SKUs to sets (CRUD under `/api/products`).
- **Admin UX** — List page (`/recommendations`), multi-step editor with presets, live placement preview, frequency-cap form, targeting JSON, autosave/dirty tracking, and optional **Conversion Intelligence** panel (heuristics + optional OpenAI).
- **Storefront** — `GET /proxy/recommendations` resolves sets for `shop` + `placement` + context query params; frequency state can be passed for client-side filtering (aligned with campaign frequency patterns).
- **Admin preview** — `POST /api/recommendations/resolve-preview` mirrors resolution with optional debug.
- **Tests** — Backend: Node’s test runner + optional Prisma integration tests. Frontend: Vitest for wizard, presets, fingerprints, assistant patch helpers.

## Key files (by area)

| Area | Location |
|------|----------|
| API routes | `backend/routes/products.js`, `recommendationSets.js`, `recommendationTargeting.js`, `conversionIntelligence.js`; `backend/app.js` (app factory), `backend/server.js` |
| Domain logic | `backend/services/recommendationSetService.js`, `recommendationResolveService.js`, `recommendationRuleEvaluators.js`, `recommendationTargetContext.js`, `productService.js` |
| Frequency caps | `backend/lib/frequencyCap.js`; proxy wiring in `backend/routes/proxy.js` |
| Presets (server) | `backend/lib/recommendationPresets.js` (catalog + validation) |
| AI helper | `backend/lib/conversionIntelligence/` (orchestrator, schemas, prompts, providers) |
| Admin API client | `frontend/src/lib/api.js` |
| Pages | `frontend/src/pages/Recommendations.jsx`, `RecommendationSetEditor.jsx` |
| Wizard / preview | `frontend/src/features/recommendations/wizard/*`, `preview/*` |
| Presets (UI) | `frontend/src/features/recommendations/presets/recommendationPresets.js` |
| Assistant UI | `frontend/src/features/conversion-intelligence/*` |
| Extension notes | `backend/lib/featureExtensionPoints.js` |

## API wiring (sanity check)

- `GET/POST/PUT/DELETE /api/products` — `merchantId` query on list; optional `merchantId` on GET by id for tenant scope.
- `GET/POST/PUT/DELETE /api/recommendation-sets` — same pattern; `GET .../presets/catalog` for preset summaries.
- `POST /api/recommendations/resolve-preview` — authenticated targeting preview.
- `POST /api/conversion-intelligence/recommendation-assistant` — authenticated assistant; body validated by `recommendationAssistantRequest.js`.
- `GET /proxy/recommendations` — storefront; HMAC optional per `optionalProxyHmac`.

## Known limitations

- **Auth model** — Admin JWT is not yet bound to specific merchants; `merchantId` is client-supplied. Optional `?merchantId=` on GET-by-id reduces IDOR when used; full SaaS ACL would tie users to merchants in the database.
- **AI** — Without `OPENAI_API_KEY`, the assistant uses deterministic heuristics (still useful). With a key, outbound calls depend on provider availability and quotas.
- **Integration tests** — Full HTTP + Prisma CRUD tests run only when `RUN_INTEGRATION_TESTS=1` and a migrated `DATABASE_URL` are set (`npm run test:integration` in `backend`).
- **Preview vs production** — Client preview uses the same rule semantics as the backend evaluators, but mock storefront data is simplified; always validate on a staging shop.
- **Empty `features/presets/`** — Folder is reserved; smart presets live under `recommendations/presets/`.

## Recommended next steps

1. **Tenant ACL** — Associate users with merchants (or Shopify staff) and enforce `merchantId` server-side for all mutating routes.
2. **E2E** — Playwright/Cypress for critical paths: list → create → save → publish → verify proxy JSON.
3. **Observability** — Structured logs and metrics for assistant latency, proxy resolution counts, and OpenAI errors.
4. **Preset sync** — Optionally generate preset catalog JSON from a single shared module or build step to avoid drift between admin bundle and API catalog.
5. **Storefront engine** — Version the public JSON contract if the overlay engine needs backward-compatible evolution.

## QA checklist (manual)

- [ ] Recommendations list: select store, load sets, open editor, navigate steps on narrow and wide viewports.
- [ ] New set: preset → placement → products → design → rules → publish; confirm preview updates.
- [ ] Assistant: run a suggestion, apply patch, confirm draft updates; test without API key (heuristic).
- [ ] Frequency cap: set limits, confirm preview copy and proxy payload shape if integrated in engine.
- [ ] `GET /proxy/recommendations?shop=…&placement=…` with real shop domain (staging).
