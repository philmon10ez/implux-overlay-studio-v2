/**
 * Feature-based modules for the Poptek admin app.
 *
 * Layout (scalable):
 * - campaign-builder/ — wizard constants + steps (DesignerStep, TriggerRulesStep, …); page shell in pages/CampaignBuilder.jsx
 * - presets/ — reserved for shared template helpers (recommendation presets live under recommendations/presets/)
 * - recommendations/ — Recommendations list + set editor (pages in src/pages/Recommendations*.jsx)
 * - conversion-intelligence/ — Recommendation assistant panel + /api/conversion-intelligence (heuristics + optional OpenAI)
 *
 * Full implementation plan: repository root FEATURE_ROADMAP.md
 *
 * Conventions: match existing Tailwind tokens (poptek-action / gray scale / rounded-lg borders).
 * Do not import from here into overlay-engine (storefront); share only documented JSON shapes.
 */

export {};
