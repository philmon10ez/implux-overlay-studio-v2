# Implux — Feature implementation roadmap

This document audits the **overlay-studio** stack (admin Vite/React frontend, Express/Prisma backend, Shopify theme extension `overlay-engine`) and plans six feature areas without changing runtime behavior beyond small, safe consolidations. Canonical detail for folder layout: `overlay-studio/frontend/src/features/index.js` and `overlay-studio/backend/lib/featureExtensionPoints.js`.

---

## Current architecture (audit)

| Layer | Location | Role |
|--------|-----------|------|
| Admin UI | `overlay-studio/frontend` | Vite, React Router, Tailwind (`accent`, `shadow-card`, `ml-56` layout). Pages under `src/pages/`; shared UI under `src/components/`; API in `src/lib/api.js`. |
| Backend API | `overlay-studio/backend` | Express in `server.js`: `/api/auth`, `/merchants`, `/campaigns`, `/analytics`, `/rakuten`, `/shopify`; storefront `POST/GET /proxy` with separate CORS. |
| Database | `overlay-studio/backend/prisma/schema.prisma` | `Campaign.triggerConfig` and `Campaign.designConfig` are **Json** (flexible; no migrations for new keys if you extend JSON). `CampaignEvent` powers analytics timeseries. |
| Storefront | `overlay-studio/shopify-app/extensions/overlay-engine/assets/overlay-engine.js` | Reads published campaigns (via proxy), evaluates triggers, renders DOM, sends beacon events. **Must stay in sync** with admin trigger/design fields. |
| Shopify app DB | `overlay-studio/shopify-app/prisma/schema.prisma` | **Session only** — not for campaign data. |

**Campaign builder today:** `src/pages/CampaignBuilder.jsx` (~1.5k lines) owns step state (`step` 1–5), `triggerConfig`, `designConfig`, `promoConfig`, merchants load, save/publish. **Preview:** `src/components/OverlayPreview.jsx` (mirrors overlay DOM patterns).

---

## Preflight refactors (done)

1. **Frequency cap parity:** `overlay-engine.js` uses `frequencyCapAllowsShow` / `markFrequencyCapShown` — `once_per_day` (UTC date bucket in localStorage) and `always` (no storage) are implemented alongside `once_ever` / `once_per_session`. Option list: `frontend/src/lib/campaignTriggerShared.js`.
2. **`promoConfig`:** Prisma `Campaign.promoConfig` (JSON), API create/update/duplicate/normalize, proxy `GET /proxy/campaigns` includes it; admin saves and reloads full promo object.
3. **Campaign builder split:** Step UI in `frontend/src/features/campaign-builder/` (`constants.js`, `steps/*.jsx`); orchestration remains in `pages/CampaignBuilder.jsx`.

---

## 1. Product Recommendations module

**Goal:** Show dynamic product slots in overlays (e.g. upsell modal) driven by rules or Shopify data.

| Area | Proposal |
|------|-----------|
| **Data** | Add `designConfig.recommendations` (or top-level `Json` on `Campaign`) with `{ source: 'manual' \| 'collection' \| 'shopify_related', handles?: string[], collectionId?: string, maxItems: number }`. Version the shape in code. |
| **Backend** | New route module `backend/routes/recommendations.js` (or `campaigns/:id/products`) using merchant `accessToken` + Shopify Admin API / Storefront API. Cache short TTL in memory or Redis later. Mount in `server.js` after auth patterns from `campaigns.js`. |
| **Storefront** | `overlay-engine.js`: after fetch campaigns, optionally fetch product JSON for embedded handles; render cards inside `buildOverlayDOM` / upsell path. |
| **Admin UI** | New subsection under Designer step (step 3) or a 6th step — prefer **collapsible panel inside Designer** for upsell-related types first. Reuse `DataTable`-style patterns only if listing many products; otherwise select + chips. |

**Reuses:** `api.js` client pattern; merchant scope already on campaign load.

---

## 2. More specific frequency capping

**Goal:** e.g. max N impressions per day, cooldown hours, per-user bucket, respect `once_per_day` / `always`.

| Area | Proposal |
|------|-----------|
| **Schema (JSON)** | Extend `triggerConfig`: `frequencyCap` enum + optional `frequencyCapMaxPerDay`, `frequencyCapCooldownHours`, `frequencyCapScope: 'browser' \| 'device'` (future server scope needs identity). |
| **Engine** | Centralize in `overlay-engine.js` in one `function shouldSuppressByFrequencyCap(campaign)` used from `initCampaign` and show paths. Use `localStorage` keys with campaign id + date for day buckets; store impression counts as integers. |
| **Admin** | Replace single select with conditional fields (show number inputs when “custom” or advanced cap). Keep using `campaignTriggerShared.js` as the single option list. |

---

## 3. Better UX in the designer section

**Goal:** Less scroll fatigue, clearer grouping, faster iteration.

| Area | Proposal |
|------|-----------|
| **Structure** | Extract `DesignerStep.jsx`, `DesignerExitIntentPanel.jsx`, `DesignerSpinWheelPanel.jsx`, etc., under `src/features/campaign-builder/components/`. Pass `designConfig` / `setDesignConfig` / `type` as props. |
| **Patterns** | Keep existing Tailwind: `rounded-lg border`, `text-sm font-medium text-gray-700`, accent callouts. Add **accordion** or **tabs** (“Content”, “Brand”, “Behavior”) using the same border/radius language. |
| **A11y** | Associate labels with inputs (some already use `label` + `htmlFor` inconsistently); fix as you extract. |

---

## 4. Smart presets

**Goal:** One-click apply industry templates (copy, colors, triggers).

| Area | Proposal |
|------|-----------|
| **Data** | `frontend/src/features/presets/presetLibrary.js` exporting `{ id, label, type?, triggerConfig: Partial, designConfig: Partial }[]`. No DB required for v1; optional `MerchantPreset` table later. |
| **UI** | Modal or horizontal scroll cards on **Setup** or top of **Designer**; “Apply” merges with `deepMerge` utility (new `lib/deepMerge.js`) so partial presets don’t wipe fields. |
| **Backend** | None for v1. |

---

## 5. Dominant live preview (sticky while scrolling)

**Goal:** Preview remains visible while editing long designer forms.

| Area | Proposal |
|------|-----------|
| **Layout** | In Designer step, change right column wrapper to `lg:sticky lg:top-20 lg:self-start z-20` (header is `z-30` in `Layout.jsx`). Ensure parent flex doesn’t use `overflow-hidden` that breaks sticky. |
| **Component** | Optional wrapper `components/StickyPreviewPanel.jsx` around `OverlayPreview` for reuse on Review step if desired. |

---

## 6. Conversion Intelligence AI helper

**Goal:** Suggest copy/trigger tweaks from campaign + aggregate stats (and later external LLM).

| Area | Proposal |
|------|-----------|
| **Data** | Read-only: existing `GET /api/analytics/timeseries`, `topcampaigns`, campaign aggregates. Optional new endpoint `GET /api/campaigns/:id/insights` bundling metrics + funnel. |
| **AI** | New `backend/routes/aiInsights.js` or `services/conversionInsightsService.js`: build prompt from anonymized metrics + `designConfig` headlines; call OpenAI/Anthropic with **server-side** API key; never send PII. Feature-flag via env `AI_INSIGHTS_ENABLED`. |
| **Admin** | `src/features/conversion-intelligence/ConversionCoachPanel.jsx` — side drawer or bottom sheet on Campaign Builder with “Suggest improvements” and diff preview; user must click Apply to mutate `designConfig`. |

**Guardrails:** Rate limit, merchant scoping on campaign id, no auto-publish.

---

## Reusable components (existing)

- `OverlayPreview` — keep as the single visual source of truth for builder preview; extend props if recommendations need mock product tiles.
- `ConfirmModal`, `DataTable`, `StatCard`, `StatusBadge` — use for presets list, AI confirm apply, analytics snippets.
- `Layout` / `Sidebar` — add nav entry only if Recommendations or Insights become top-level pages; otherwise keep inside Campaign Builder.

---

## State centralization recommendation

Introduce **`CampaignBuilderContext`** (or Zustand store in `features/campaign-builder/store.js`) holding:

`{ name, merchantId, type, triggerConfig, designConfig, promoConfig, step, mobilePreview, setters }`

**Benefits:** Sticky preview, AI panel, and preset modal read the same state without prop drilling. **Migration:** Move one step at a time from `CampaignBuilder.jsx` to avoid a big-bang refactor.

---

## Suggested implementation order

1. ~~Frequency cap parity, `promoConfig`, builder split~~ (done).  
2. Sticky preview (`lg:sticky` on designer preview column) + optional `CampaignBuilderContext`.  
3. Preset library + deep merge.  
4. Recommendations API + design JSON + engine rendering.  
5. AI insights service + Conversion Coach UI + env flag.

---

## Files added for this audit

- `FEATURE_ROADMAP.md` (this file)  
- `overlay-studio/frontend/src/features/index.js`  
- `overlay-studio/frontend/src/features/*/.gitkeep` (feature buckets)  
- `overlay-studio/frontend/src/lib/campaignTriggerShared.js`  
- `overlay-studio/backend/lib/featureExtensionPoints.js`  

Comments in `CampaignBuilder.jsx` and `overlay-engine.js` point here for ongoing work.
