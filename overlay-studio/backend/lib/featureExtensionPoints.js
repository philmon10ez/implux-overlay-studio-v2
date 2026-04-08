/**
 * Backend extension guide (Implux API)
 *
 * New domain routes: add `routes/<name>.js`, `router.use(auth)` when admin-only,
 * mount in server.js with `app.use('/api/<name>', <name>Routes)`.
 *
 * Campaign-shaped JSON: prefer extending triggerConfig / designConfig with versioned
 * keys rather than many Prisma columns until the shape stabilizes. Use migrations
 * when adding top-level columns (e.g. promoConfig Json).
 *
 * Storefront contract: anything consumed by overlay-engine must be documented and
 * kept backward-compatible or gated by engine version if needed.
 *
 * Recommendations module map:
 * - Targeting rules: `services/recommendationRuleEvaluators.js` (array + `registerRecommendationRule`)
 * - Resolution: `services/recommendationResolveService.js` (storefront + admin preview)
 * - Page context: `services/recommendationTargetContext.js`
 * - Preset keys + catalog: `lib/recommendationPresets.js`
 * - Admin AI helper: `lib/conversionIntelligence/index.js` (orchestrator + schemas)
 * - Shared request parsing: `lib/http/parseApiParams.js`
 *
 * Roadmap: see FEATURE_ROADMAP.md at repository root.
 *
 * Tests: `npm test` in overlay-studio/backend (node --test); optional DB integration
 * `npm run test:integration` with DATABASE_URL + migrations. Frontend: `npm test` in overlay-studio/frontend (vitest).
 */

export {};
