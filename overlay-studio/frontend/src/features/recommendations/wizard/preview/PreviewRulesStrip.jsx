import { useMemo } from 'react';
import { frequencyCapFormToPayload, frequencyCapPayloadSummary } from '../../../../lib/frequencyCapForm';
import { buildPreviewEvaluationContext, MOCK_MERCHANT } from './mockMerchantContext';
import { evaluateRecommendationTriggersPreview } from './evaluateTriggersPreview';

function parseTriggerJson(raw) {
  const t = String(raw ?? '').trim();
  if (!t) return { ok: true, conditions: {}, error: null };
  try {
    const parsed = JSON.parse(t);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, conditions: null, error: 'Triggers must be a JSON object.' };
    }
    return { ok: true, conditions: parsed, error: null };
  } catch {
    return { ok: false, conditions: null, error: 'Invalid JSON.' };
  }
}

function conditionSummaryChips(conditions) {
  const c = conditions && typeof conditions === 'object' ? conditions : {};
  const chips = [];
  const n = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null);
  if (n(c.minCartSubtotal)) chips.push({ key: 'minCart', text: `Cart ≥ $${c.minCartSubtotal}` });
  if (n(c.maxCartSubtotal)) chips.push({ key: 'maxCart', text: `Cart ≤ $${c.maxCartSubtotal}` });
  if (c.requireNonEmptyCart === true || c.requireNonEmptyCart === 1 || c.requireNonEmptyCart === 'true') {
    chips.push({ key: 'nec', text: 'Non-empty cart' });
  }
  const anySku = Array.isArray(c.cartSkusAny) ? c.cartSkusAny.length : 0;
  if (anySku) chips.push({ key: 'csa', text: `Cart has any of ${anySku} SKU(s)` });
  const allSku = Array.isArray(c.cartSkusAll) ? c.cartSkusAll.length : 0;
  if (allSku) chips.push({ key: 'csall', text: `Cart has all ${allSku} SKU(s)` });
  const cur = Array.isArray(c.currentSkusAny) ? c.currentSkusAny.length : 0;
  if (cur) chips.push({ key: 'cur', text: `PDP SKU in ${cur} option(s)` });
  if (n(c.productCategory)) chips.push({ key: 'pcat', text: `Category: ${c.productCategory}` });
  const pany = Array.isArray(c.productCategoriesAny) ? c.productCategoriesAny.length : 0;
  if (pany) chips.push({ key: 'pcanya', text: `Category in ${pany} list` });
  const tags = Array.isArray(c.tagsAny) ? c.tagsAny.length : 0;
  if (tags) chips.push({ key: 'tags', text: `Tags: ${tags}` });
  const cols = Array.isArray(c.collectionIdsAny) ? c.collectionIdsAny.length : 0;
  if (cols) chips.push({ key: 'col', text: `Collections: ${cols}` });
  if (n(c.priority)) chips.push({ key: 'pri', text: `Priority ${c.priority}` });
  return chips;
}

/** @param {{ placementType: 'product_page'|'cart'|'checkout', triggerJson: string, frequencyCap: object }} props */
export default function PreviewRulesStrip({ placementType, triggerJson, frequencyCap }) {
  const parsed = useMemo(() => parseTriggerJson(triggerJson), [triggerJson]);
  const evalCtx = useMemo(() => buildPreviewEvaluationContext(placementType), [placementType]);
  const triggerResult = useMemo(() => {
    if (!parsed.ok || !parsed.conditions) return null;
    return evaluateRecommendationTriggersPreview(parsed.conditions, evalCtx);
  }, [parsed, evalCtx]);

  const freqSummary = useMemo(() => {
    const payload = frequencyCapFormToPayload(frequencyCap);
    return frequencyCapPayloadSummary(payload);
  }, [frequencyCap]);

  const activeChips = useMemo(() => {
    if (!parsed.ok || !parsed.conditions) return [];
    return conditionSummaryChips(parsed.conditions);
  }, [parsed]);

  const hasConfiguredRules = activeChips.length > 0;
  const scenarioLine =
    placementType === 'product_page'
      ? `Sample PDP SKU ${MOCK_MERCHANT.pdp.sku} · mock cart $${MOCK_MERCHANT.cart.subtotal}`
      : `Mock cart $${MOCK_MERCHANT.cart.subtotal} · ${MOCK_MERCHANT.cart.lines.length} lines`;

  return (
    <div className="rounded-lg border border-gray-200/90 bg-gray-50/90 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Simulator</span>
        <span className="text-[10px] text-gray-600">{scenarioLine}</span>
      </div>
      {!parsed.ok ? (
        <p className="mt-1.5 text-xs font-medium text-red-700">{parsed.error}</p>
      ) : null}
      {parsed.ok && hasConfiguredRules ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {activeChips.map((ch) => (
            <span
              key={ch.key}
              className="inline-flex max-w-full truncate rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700 ring-1 ring-gray-200/80"
              title={ch.text}
            >
              {ch.text}
            </span>
          ))}
        </div>
      ) : parsed.ok ? (
        <p className="mt-1.5 text-[11px] text-gray-600">No targeting rules — block can show whenever placement matches.</p>
      ) : null}
      {parsed.ok && triggerResult && !triggerResult.ok ? (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
          <p className="text-[11px] font-semibold text-amber-900">Would not match this sample context</p>
          <p className="mt-0.5 text-[10px] leading-snug text-amber-900/90">
            Failed: {triggerResult.failedRules.join(', ')}. Tune rules or expect different storefront data.
          </p>
        </div>
      ) : null}
      {parsed.ok && triggerResult && triggerResult.ok && hasConfiguredRules ? (
        <p className="mt-2 text-[10px] font-medium text-emerald-800">Matches sample context</p>
      ) : null}
      <div className="mt-2 border-t border-gray-200/80 pt-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Frequency</span>
        <span className="ml-2 text-[11px] text-gray-700">{freqSummary}</span>
      </div>
    </div>
  );
}
