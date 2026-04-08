/**
 * Single source of truth for the assistant JSON response shape.
 * Referenced by system prompts and documentation; parser lives in parseAssistantModelOutput.js.
 */

export const ASSISTANT_RESPONSE_SCHEMA_VERSION = 1;

/**
 * Human/model-readable description of the exact JSON root (no markdown in model output).
 */
export const OUTPUT_ROOT_SPEC = `
Root object fields (all required unless noted):
- "summary" (string): 1–2 sentences. Lead with the most important takeaway for the merchant.
- "reasoning" (string, optional but recommended): 2–4 sentences tying suggestions to THIS configuration (placement, cart/checkout context, catalog, caps). Omit fluff.
- "suggestions" (array): 3–6 items when possible, ordered by expected impact (highest first). Fewer is OK if context is already strong.
`.trim();

/**
 * Each suggestion the UI renders as a card; "apply" drives one-click merge in the admin.
 */
export const OUTPUT_SUGGESTION_SPEC = `
Each element of "suggestions":
- "id" (string): stable snake_case or kebab-case, unique in the array (e.g. "suggest_pdp_narrow_focus").
- "category" (string): exactly one of: "products" | "placement" | "copy" | "frequency" | "rules" | "general"
  • products — which SKUs to recommend, count, ordering strategy, complements vs alternatives
  • placement — product_page vs cart vs checkout fit
  • copy — headline, supporting line, CTA label, tone, clarity
  • frequency — session/day/lifetime caps, cooldowns, "none" when appropriate
  • rules — trigger JSON (targeting): cart value, SKUs in cart, categories, tags, etc.
  • general — cross-cutting strategy, measurement, or UX when it does not fit above
- "title" (string): short UI headline (≤ 80 chars).
- "detail" (string): 1–3 sentences; concrete, imperative where possible; merchant can act without guessing.
- "reasoning" (string, optional): one sentence: why this matters for conversion in this context.
- "apply" (object | null):
  • Use null when advice is strategic only, or when you are not confident in exact field values.
  • When non-null, include ONLY keys you want merged; omit keys you are not changing.
  • Allowed keys (each optional within the object):
    - "placementType": "product_page" | "cart" | "checkout"
    - "presentation": { "headline"?, "subcopy"?, "ctaLabel"? } — strings only; empty string clears (prefer omit key if unchanged)
    - "frequencyCap": { "frequency_cap_type"?: "standard"|"none", "max_impressions_per_session"?, "max_impressions_per_day"?, "cooldown_minutes"?, "max_impressions_lifetime"? } — use string numbers as in admin forms, or "" to leave open
    - "triggerJson": a single string containing valid JSON for an OBJECT (e.g. "{\\"minCartSubtotal\\":50}")
    - "addProductIds": number[] — ONLY ids that appear in the provided catalog sample; max 12 ids per suggestion; never invent ids
`.trim();

/**
 * Minimal valid example (for few-shot style anchoring in the system prompt).
 */
export const OUTPUT_JSON_EXAMPLE = `{
  "summary": "Your checkout placement is strong, but frequency and CTA copy are likely leaving conversions on the table.",
  "reasoning": "Checkout shoppers have high intent; repeating the same block can feel pushy, and vague CTAs reduce clarity at the moment of purchase.",
  "suggestions": [
    {
      "id": "checkout_freq_session_cap",
      "category": "frequency",
      "title": "Cap to one impression per session on checkout",
      "detail": "Use a session cap so returning steps in checkout do not repeat the same nudge. Start with 1 per session and adjust from analytics.",
      "reasoning": "Reduces annoyance while preserving a single high-value touchpoint.",
      "apply": {
        "frequencyCap": {
          "frequency_cap_type": "standard",
          "max_impressions_per_session": "1"
        }
      }
    },
    {
      "id": "checkout_cta_add_to_order",
      "category": "copy",
      "title": "Use a checkout-specific CTA",
      "detail": "Prefer short transactional labels such as Add to order or Add to purchase over generic Shop now on checkout.",
      "apply": {
        "presentation": { "ctaLabel": "Add to order" }
      }
    }
  ]
}`;
