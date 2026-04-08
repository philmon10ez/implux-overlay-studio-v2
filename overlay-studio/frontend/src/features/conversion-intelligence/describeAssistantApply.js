import { frequencyCapFormToPayload, frequencyCapPayloadSummary } from '../../lib/frequencyCapForm';
import { placementLabelForApply } from './recommendationAssistantStepConfig';

/**
 * Human-readable lines describing what an apply payload will change (for preview before click).
 * @param {object | null | undefined} apply
 * @param {object} [opts]
 * @param {import('../../lib/frequencyCapForm').defaultFrequencyCapForm} [opts.currentFrequencyCap] — for diff-style frequency line
 */
export function describeAssistantApply(apply, opts = {}) {
  if (!apply || typeof apply !== 'object') return [];
  const lines = [];

  if (apply.placementType) {
    const label = placementLabelForApply(apply.placementType);
    lines.push(`Placement → ${label}`);
  }

  if (apply.presentation && typeof apply.presentation === 'object') {
    const p = apply.presentation;
    if (Object.prototype.hasOwnProperty.call(p, 'headline') && p.headline != null && String(p.headline).trim()) {
      lines.push(`Headline → “${truncate(String(p.headline), 48)}”`);
    }
    if (Object.prototype.hasOwnProperty.call(p, 'subcopy') && p.subcopy != null && String(p.subcopy).trim()) {
      lines.push(`Supporting line → “${truncate(String(p.subcopy), 48)}”`);
    }
    if (Object.prototype.hasOwnProperty.call(p, 'ctaLabel') && p.ctaLabel != null && String(p.ctaLabel).trim()) {
      lines.push(`Button (CTA) → “${truncate(String(p.ctaLabel), 32)}”`);
    }
  }

  if (apply.frequencyCap && typeof apply.frequencyCap === 'object') {
    const keys = Object.keys(apply.frequencyCap).filter((k) => apply.frequencyCap[k] !== undefined);
    if (keys.length) {
      const merged = { ...(opts.currentFrequencyCap || {}), ...apply.frequencyCap };
      const summary = frequencyCapPayloadSummary(frequencyCapFormToPayload(merged));
      lines.push(`Frequency → ${summary}`);
    }
  }

  if (typeof apply.triggerJson === 'string' && apply.triggerJson.trim()) {
    const t = apply.triggerJson.trim();
    lines.push(`Trigger rules → JSON (${t.length} chars)`);
  }

  if (Array.isArray(apply.addProductIds) && apply.addProductIds.length > 0) {
    const n = apply.addProductIds.length;
    lines.push(`Products → add up to ${n} from catalog${n > 1 ? ' (skipped if already selected)' : ''}`);
  }

  return lines;
}

function truncate(s, max) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}
