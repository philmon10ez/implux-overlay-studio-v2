/**
 * Campaign / recommendation set frequency cap form state (snake_case API fields).
 * Storefront resolution: backend `resolveFrequencyCapForCampaign` + overlay-engine.
 */

export const defaultFrequencyCapForm = {
  frequency_cap_type: 'standard',
  max_impressions_per_session: '1',
  max_impressions_per_day: '',
  cooldown_minutes: '',
  max_impressions_lifetime: '',
};

function numOrEmpty(v) {
  if (v === '' || v === null || v === undefined) return '';
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? String(n) : '';
}

/**
 * @param {Record<string, unknown> | null | undefined} raw
 */
export function mergeFrequencyCapFromApi(raw) {
  if (!raw || typeof raw !== 'object') return { ...defaultFrequencyCapForm };
  const o = raw;
  const t = String(o.frequency_cap_type ?? 'standard').toLowerCase();
  return {
    frequency_cap_type: t === 'none' ? 'none' : 'standard',
    max_impressions_per_session: numOrEmpty(o.max_impressions_per_session),
    max_impressions_per_day: numOrEmpty(o.max_impressions_per_day),
    cooldown_minutes: numOrEmpty(o.cooldown_minutes),
    max_impressions_lifetime: numOrEmpty(o.max_impressions_lifetime),
  };
}

/**
 * Derive form state when API has no frequencyCap JSON (legacy triggerConfig.frequencyCap).
 * @param {string} legacy
 */
export function frequencyCapFormFromLegacyTrigger(legacy) {
  const v = String(legacy || 'always').toLowerCase();
  if (v === 'once_ever') {
    return {
      frequency_cap_type: 'standard',
      max_impressions_per_session: '',
      max_impressions_per_day: '',
      cooldown_minutes: '',
      max_impressions_lifetime: '1',
    };
  }
  if (v === 'once_per_session') {
    return {
      frequency_cap_type: 'standard',
      max_impressions_per_session: '1',
      max_impressions_per_day: '',
      cooldown_minutes: '',
      max_impressions_lifetime: '',
    };
  }
  if (v === 'once_per_day') {
    return {
      frequency_cap_type: 'standard',
      max_impressions_per_session: '',
      max_impressions_per_day: '1',
      cooldown_minutes: '',
      max_impressions_lifetime: '',
    };
  }
  return { ...defaultFrequencyCapForm, frequency_cap_type: 'none', max_impressions_per_session: '' };
}

/**
 * @param {typeof defaultFrequencyCapForm} form
 */
export function frequencyCapFormToPayload(form) {
  const type = form.frequency_cap_type === 'none' ? 'none' : 'standard';
  const parseOpt = (s) => {
    const t = String(s ?? '').trim();
    if (!t) return null;
    const n = Math.floor(Number(t));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  return {
    frequency_cap_type: type,
    max_impressions_per_session: parseOpt(form.max_impressions_per_session),
    max_impressions_per_day: parseOpt(form.max_impressions_per_day),
    cooldown_minutes: parseOpt(form.cooldown_minutes),
    max_impressions_lifetime: parseOpt(form.max_impressions_lifetime),
  };
}

/**
 * @param {ReturnType<typeof frequencyCapFormToPayload>} payload
 */
export function frequencyCapPayloadSummary(payload) {
  if (!payload || payload.frequency_cap_type === 'none') return 'No limit';
  const parts = [];
  if (payload.max_impressions_per_session)
    parts.push(`Up to ${payload.max_impressions_per_session} per session`);
  if (payload.max_impressions_per_day) parts.push(`Up to ${payload.max_impressions_per_day} per day (UTC)`);
  if (payload.cooldown_minutes) parts.push(`${payload.cooldown_minutes} min between displays`);
  if (payload.max_impressions_lifetime) parts.push(`Up to ${payload.max_impressions_lifetime} lifetime`);
  return parts.length ? parts.join(' · ') : 'Custom limits (no numeric caps set)';
}
