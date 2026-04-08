import { PLACEMENT_OPTIONS } from '../recommendations/constants';

const ALLOWED_PLACEMENT = new Set(PLACEMENT_OPTIONS.map((o) => o.value));

const PRESENTATION_KEYS = ['headline', 'subcopy', 'ctaLabel'];

/**
 * Apply a server suggestion patch to recommendation set editor state.
 * Only keys explicitly present in patch objects are merged — avoids wiping fields with empty spreads.
 * @returns {{ applied: boolean, errors: string[], summaryLines: string[] }}
 */
export function applyRecommendationAssistantPatch(patch, handlers) {
  const errors = [];
  const summaryLines = [];
  if (!patch || typeof patch !== 'object') {
    return { applied: false, errors: ['Nothing to apply'], summaryLines: [] };
  }

  let applied = false;

  if (patch.placementType && ALLOWED_PLACEMENT.has(patch.placementType)) {
    handlers.setPlacementType(patch.placementType);
    applied = true;
    const label = PLACEMENT_OPTIONS.find((o) => o.value === patch.placementType)?.label ?? patch.placementType;
    summaryLines.push(`Placement: ${label}`);
  }

  if (patch.presentation && typeof patch.presentation === 'object') {
    const pres = patch.presentation;
    const hasAny = PRESENTATION_KEYS.some((k) => Object.prototype.hasOwnProperty.call(pres, k));
    if (hasAny) {
      handlers.setPresentation((prev) => {
        const next = { ...prev };
        for (const k of PRESENTATION_KEYS) {
          if (Object.prototype.hasOwnProperty.call(pres, k)) {
            next[k] = pres[k] == null ? '' : String(pres[k]);
          }
        }
        return next;
      });
      applied = true;
      if (Object.prototype.hasOwnProperty.call(pres, 'headline') && String(pres.headline || '').trim()) {
        summaryLines.push('Headline updated');
      }
      if (Object.prototype.hasOwnProperty.call(pres, 'subcopy') && String(pres.subcopy || '').trim()) {
        summaryLines.push('Supporting line updated');
      }
      if (Object.prototype.hasOwnProperty.call(pres, 'ctaLabel') && String(pres.ctaLabel || '').trim()) {
        summaryLines.push('CTA label updated');
      }
    }
  }

  if (patch.frequencyCap && typeof patch.frequencyCap === 'object') {
    const fcKeys = Object.keys(patch.frequencyCap).filter((k) => patch.frequencyCap[k] !== undefined);
    if (fcKeys.length > 0) {
      handlers.setFrequencyCap((prev) => {
        const next = { ...prev };
        for (const k of fcKeys) {
          next[k] = patch.frequencyCap[k];
        }
        return next;
      });
      applied = true;
      summaryLines.push('Frequency settings updated');
    }
  }

  if (typeof patch.triggerJson === 'string') {
    try {
      const p = JSON.parse(patch.triggerJson);
      if (p === null || typeof p !== 'object' || Array.isArray(p)) {
        errors.push('Trigger JSON must be an object.');
      } else {
        handlers.setTriggerJson(JSON.stringify(p, null, 2));
        applied = true;
        summaryLines.push('Trigger rules updated');
      }
    } catch {
      errors.push('Invalid trigger JSON from suggestion.');
    }
  }

  return { applied: errors.length ? false : applied, errors, summaryLines };
}

/**
 * @param {number[]} ids
 * @param {object[]} catalogProducts
 * @param {Set<string|number>} selectedIds
 * @param {(p: object) => void} addProduct
 * @returns {{ added: number, skipped: number }}
 */
export function applyAddProductIds(ids, catalogProducts, selectedIds, addProduct) {
  if (!Array.isArray(ids) || !ids.length) return { added: 0, skipped: 0 };
  const byId = new Map(catalogProducts.map((p) => [p.id, p]));
  let added = 0;
  let skipped = 0;
  for (const raw of ids) {
    const id = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    if (Number.isNaN(id) || id < 1) {
      skipped += 1;
      continue;
    }
    if (selectedIds.has(id)) {
      skipped += 1;
      continue;
    }
    const p = byId.get(id);
    if (!p) {
      skipped += 1;
      continue;
    }
    addProduct(p);
    added += 1;
  }
  return { added, skipped };
}
