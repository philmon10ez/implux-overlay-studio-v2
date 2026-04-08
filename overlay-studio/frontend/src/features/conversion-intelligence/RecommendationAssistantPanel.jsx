import { useCallback, useMemo, useState } from 'react';
import api from '../../lib/api';
import InlineNotice, { EmptyStateBlock } from '../recommendations/components/InlineNotice';
import { RECOMMENDATION_ASSISTANT_INTENTS, CATEGORY_LABELS } from './assistantIntents';
import { STEP_INTENT_PRIORITY, stepAssistantSubtitle } from './recommendationAssistantStepConfig';
import { describeAssistantApply } from './describeAssistantApply';

/**
 * @param {object} props
 * @param {string} [props.className]
 * @param {number} [props.step] — wizard step 2–6 for contextual hints and intent ordering
 * @param {string} [props.merchantId]
 * @param {object} props.context — live editor snapshot (placement, name, presentation, frequencyCap, triggerJson, selectedProducts; optional presetKey for AI context)
 * @param {(suggestion: object) => { ok: boolean, message?: string }} props.onApplySuggestion
 * @param {(message: string) => void} [props.onApplySuccess] — e.g. short toast; only after successful apply
 */
export default function RecommendationAssistantPanel({
  className = '',
  step = 2,
  merchantId,
  context,
  onApplySuggestion,
  onApplySuccess,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAllIntents, setShowAllIntents] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [appliedIds, setAppliedIds] = useState(() => new Set());
  const [lastIntent, setLastIntent] = useState('optimize');
  const [lastWasCustom, setLastWasCustom] = useState(false);

  const priorityIds = STEP_INTENT_PRIORITY[step] || ['optimize'];
  const orderedIntents = useMemo(() => {
    const byId = new Map(RECOMMENDATION_ASSISTANT_INTENTS.map((x) => [x.id, x]));
    const primary = priorityIds.map((id) => byId.get(id)).filter(Boolean);
    if (showAllIntents) {
      const rest = RECOMMENDATION_ASSISTANT_INTENTS.filter((x) => !priorityIds.includes(x.id));
      return [...primary, ...rest];
    }
    return primary;
  }, [priorityIds, showAllIntents]);

  const runRequest = useCallback(
    async (nextIntent, messageOverride) => {
      setLastIntent(nextIntent);
      setLastWasCustom(nextIntent === 'custom');
      setError(null);
      setLoading(true);
      setResult(null);
      setAppliedIds(new Set());
      try {
        const payload = {
          merchantId: merchantId || undefined,
          intent: nextIntent,
          userMessage: messageOverride != null ? messageOverride : customPrompt,
          context: {
            placementType: context.placementType,
            name: context.name,
            presentation: context.presentation,
            frequencyCap: context.frequencyCap,
            triggerJson: context.triggerJson,
            presetKey: context.presetKey,
            productCount: context.selectedProducts?.length ?? 0,
            selectedProducts: (context.selectedProducts || []).map((p) => ({
              id: p.id,
              title: p.title,
            })),
          },
        };
        const data = await api.conversionIntelligence.recommendationAssistant(payload);
        setResult(data);
      } catch (e) {
        const msg = e.body?.error || e.message || '';
        const net = e.status === 0 || /network|fetch/i.test(String(msg));
        setError(
          net
            ? 'Connection problem — check your network and try again.'
            : msg || 'The assistant couldn’t complete this request.'
        );
      } finally {
        setLoading(false);
      }
    },
    [merchantId, context, customPrompt]
  );

  const onQuick = (item) => {
    if (!expanded) setExpanded(true);
    runRequest(item.intent, '');
  };

  const onSubmitCustom = (e) => {
    e.preventDefault();
    if (!expanded) setExpanded(true);
    runRequest('custom', customPrompt);
  };

  const handleApply = (s) => {
    const res = onApplySuggestion(s);
    if (!res?.ok) {
      setError(res?.message || 'Could not apply suggestion');
      return;
    }
    setAppliedIds((prev) => new Set(prev).add(s.id));
    setError(null);
    if (res.message && typeof onApplySuccess === 'function') {
      onApplySuccess(res.message);
    }
  };

  const subtitle = stepAssistantSubtitle(step);

  return (
    <section
      className={`rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/40 shadow-sm ring-1 ring-violet-100/50 ${className}`}
      aria-label="Conversion Intelligence assistant"
    >
      {/* Collapsed header — assistive, low footprint */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-[11px] font-bold text-white">
              AI
            </span>
            <h3 className="text-sm font-semibold text-gray-900">Conversion Intelligence</h3>
            {result?.meta?.usedOpenAI ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                AI
              </span>
            ) : (
              <span className="rounded-full bg-gray-100/90 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                Rules + AI
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            Suggestions only change your draft when you use <span className="font-medium">Apply</span>. Nothing is
            overwritten automatically.
          </p>
          {subtitle ? <p className="mt-1 text-[11px] text-violet-800/90">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-medium text-violet-900 shadow-sm hover:bg-violet-50"
          aria-expanded={expanded}
        >
          {expanded ? 'Minimize' : 'Open suggestions'}
        </button>
      </div>

      {expanded ? (
        <>
          <div className="border-t border-violet-100/80 px-4 py-3 sm:px-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Quick focus</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {orderedIntents.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={loading}
                  onClick={() => onQuick(item)}
                  className="inline-flex flex-col items-start rounded-xl border border-violet-200/70 bg-white/90 px-3 py-2 text-left transition hover:border-violet-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-xs font-semibold text-gray-900">{item.label}</span>
                  <span className="text-[10px] text-gray-500">{item.hint}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowAllIntents((v) => !v)}
              className="mt-2 text-[11px] font-medium text-violet-700 hover:text-violet-900 hover:underline"
            >
              {showAllIntents ? 'Show fewer topics' : 'All topics'}
            </button>

            <form onSubmit={onSubmitCustom} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="ci-custom-prompt" className="sr-only">
                  Custom request
                </label>
                <textarea
                  id="ci-custom-prompt"
                  rows={2}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Ask anything about this recommendation set…"
                  className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !customPrompt.trim()}
                className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? 'Working…' : 'Ask'}
              </button>
            </form>
          </div>

          <div className="border-t border-violet-50 px-4 py-4 sm:px-5">
            {loading ? (
              <div className="flex items-center gap-3 rounded-xl border border-violet-100 bg-white/80 px-4 py-6">
                <span
                  className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600"
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Analyzing your configuration…</p>
                  <p className="text-xs text-gray-500">Uses this step’s placement, products, copy, rules, and caps.</p>
                </div>
              </div>
            ) : null}

            {error && !loading ? (
              <InlineNotice
                variant="error"
                title="Suggestion request failed"
                action={
                  <button
                    type="button"
                    onClick={() =>
                      lastWasCustom ? runRequest('custom', customPrompt) : runRequest(lastIntent, '')
                    }
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-900 shadow-sm ring-1 ring-red-200 hover:bg-red-50"
                  >
                    Retry
                  </button>
                }
              >
                {error}
              </InlineNotice>
            ) : null}

            {!loading && result?.warning ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
                {result.warning}
              </div>
            ) : null}

            {!loading && result ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Summary</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-800">{result.summary}</p>
                  {result.reasoning ? (
                    <p className="mt-2 border-t border-gray-100 pt-2 text-xs leading-relaxed text-gray-600">
                      <span className="font-medium text-gray-700">Why: </span>
                      {result.reasoning}
                    </p>
                  ) : null}
                </div>

                {result.suggestions?.length ? (
                  <ul className="space-y-3">
                    {result.suggestions.map((s) => {
                      const applyLines =
                        s.apply && Object.keys(s.apply).length > 0
                          ? describeAssistantApply(s.apply, { currentFrequencyCap: context.frequencyCap })
                          : [];
                      const canApply = applyLines.length > 0 || (s.apply && Object.keys(s.apply).length > 0);
                      const applied = appliedIds.has(s.id);

                      return (
                        <li
                          key={s.id}
                          className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm ring-1 ring-gray-100/80"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                                {CATEGORY_LABELS[s.category] || s.category || 'General'}
                              </span>
                              <h4 className="mt-2 text-sm font-semibold text-gray-900">{s.title}</h4>
                              <p className="mt-1 text-xs leading-relaxed text-gray-600">{s.detail}</p>
                              {s.reasoning ? (
                                <p className="mt-2 text-[11px] italic leading-relaxed text-gray-500">{s.reasoning}</p>
                              ) : null}

                              {applyLines.length > 0 ? (
                                <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800/80">
                                    If you apply
                                  </p>
                                  <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[11px] text-gray-700">
                                    {applyLines.map((line) => (
                                      <li key={line}>{line}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </div>
                            {canApply ? (
                              <button
                                type="button"
                                onClick={() => handleApply(s)}
                                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                  applied
                                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                                    : 'bg-accent text-white shadow-sm hover:bg-accent/90'
                                }`}
                              >
                                {applied ? 'Applied ✓' : 'Apply to draft'}
                              </button>
                            ) : (
                              <span className="shrink-0 rounded-lg bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-500">
                                Guidance only
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyStateBlock
                    emoji="💡"
                    title="No structured suggestions this time"
                    description="Try a different quick focus, or ask a specific question in the box below."
                  />
                )}
              </div>
            ) : null}

            {!loading && !error && !result ? (
              <div className="rounded-xl border border-dashed border-violet-200/80 bg-violet-50/30 px-4 py-6 text-center">
                <p className="text-sm text-gray-700">
                  Pick a <span className="font-medium">quick focus</span> or type a question — results show here. Nothing
                  changes in your set until you tap <span className="font-medium">Apply to draft</span>.
                </p>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
