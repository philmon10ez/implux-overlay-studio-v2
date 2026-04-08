/**
 * Frequency capping for campaigns and recommendation sets.
 * Used by the app proxy (optional client-reported state) and unit tests.
 * Storefront: overlay-engine mirrors this behavior; keep rules aligned.
 */

/** @typedef {'none'|'standard'} FrequencyCapType */

/** @typedef {{
 *   frequency_cap_type: FrequencyCapType,
 *   max_impressions_per_session: number | null,
 *   max_impressions_per_day: number | null,
 *   cooldown_minutes: number | null,
 *   max_impressions_lifetime: number | null,
 * }} NormalizedFrequencyCap */

/** @typedef {{
 *   sessionCount?: number,
 *   dayKey?: string,
 *   dayCount?: number,
 *   lastShownAt?: number,
 *   lifetimeCount?: number,
 * }} FrequencyEntityState */

const LEGACY_TRIGGER_CAP = {
  once_ever: {
    frequency_cap_type: 'standard',
    max_impressions_per_session: null,
    max_impressions_per_day: null,
    cooldown_minutes: null,
    max_impressions_lifetime: 1,
  },
  once_per_session: {
    frequency_cap_type: 'standard',
    max_impressions_per_session: 1,
    max_impressions_per_day: null,
    cooldown_minutes: null,
    max_impressions_lifetime: null,
  },
  once_per_day: {
    frequency_cap_type: 'standard',
    max_impressions_per_session: null,
    max_impressions_per_day: 1,
    cooldown_minutes: null,
    max_impressions_lifetime: null,
  },
  always: {
    frequency_cap_type: 'none',
    max_impressions_per_session: null,
    max_impressions_per_day: null,
    cooldown_minutes: null,
    max_impressions_lifetime: null,
  },
};

const NONE_CAP = {
  frequency_cap_type: 'none',
  max_impressions_per_session: null,
  max_impressions_per_day: null,
  cooldown_minutes: null,
  max_impressions_lifetime: null,
};

function clampPositiveInt(n, max = 1_000_000) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x) || x < 1) return null;
  return Math.min(x, max);
}

/**
 * Parse + sanitize persisted/API frequency cap JSON (snake_case fields).
 * @param {unknown} raw
 * @returns {NormalizedFrequencyCap}
 */
export function sanitizeFrequencyCapPayload(raw) {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...NONE_CAP };
  }
  const o = /** @type {Record<string, unknown>} */ (raw);
  const t = String(o.frequency_cap_type ?? 'none').toLowerCase();
  let type = t === 'standard' ? 'standard' : 'none';
  const max_impressions_per_session = clampPositiveInt(o.max_impressions_per_session);
  const max_impressions_per_day = clampPositiveInt(o.max_impressions_per_day);
  const cooldown_minutes = clampPositiveInt(o.cooldown_minutes, 60 * 24 * 365);
  const max_impressions_lifetime = clampPositiveInt(o.max_impressions_lifetime);
  if (
    type === 'none' &&
    (max_impressions_per_session || max_impressions_per_day || cooldown_minutes || max_impressions_lifetime)
  ) {
    type = 'standard';
  }
  return {
    frequency_cap_type: type,
    max_impressions_per_session,
    max_impressions_per_day,
    cooldown_minutes,
    max_impressions_lifetime,
  };
}

/**
 * Merge DB JSON + legacy triggerConfig.frequencyCap string.
 * @param {{ frequencyCap?: unknown, triggerConfig?: unknown }} campaign
 * @returns {NormalizedFrequencyCap}
 */
export function resolveFrequencyCapForCampaign(campaign) {
  if (!campaign) return { ...NONE_CAP };
  const db = campaign.frequencyCap;
  if (db != null && typeof db === 'object' && !Array.isArray(db)) {
    return sanitizeFrequencyCapPayload(db);
  }
  const tc = campaign.triggerConfig && typeof campaign.triggerConfig === 'object' ? campaign.triggerConfig : {};
  const legacy = String(/** @type {Record<string, unknown>} */ (tc).frequencyCap ?? 'always').toLowerCase();
  const mapped = LEGACY_TRIGGER_CAP[legacy];
  if (mapped) return { ...mapped };
  return { ...NONE_CAP };
}

/**
 * @param {{ frequencyCap?: unknown }} setRow
 * @returns {NormalizedFrequencyCap}
 */
export function resolveFrequencyCapForRecommendationSet(setRow) {
  if (!setRow || setRow.frequencyCap == null) return { ...NONE_CAP };
  return sanitizeFrequencyCapPayload(setRow.frequencyCap);
}

export function utcDateString(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/**
 * Effective day count for limits (resets when UTC calendar day changes).
 */
function effectiveDayCount(state, todayKey) {
  if (!state || state.dayKey !== todayKey) return 0;
  return Math.max(0, Math.floor(Number(state.dayCount) || 0));
}

/**
 * @param {NormalizedFrequencyCap} cap
 * @param {FrequencyEntityState | null | undefined} state
 * @param {number} nowMs
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function evaluateFrequencyCap(cap, state, nowMs) {
  if (!cap || cap.frequency_cap_type === 'none') {
    return { allowed: true };
  }
  const todayKey = utcDateString(new Date(nowMs));
  const sessionCount = Math.max(0, Math.floor(Number(state?.sessionCount) || 0));
  const dayCount = effectiveDayCount(state, todayKey);
  const lifetimeCount = Math.max(0, Math.floor(Number(state?.lifetimeCount) || 0));
  const lastShown = state?.lastShownAt != null ? Number(state.lastShownAt) : null;

  const cooldownMin = cap.cooldown_minutes;
  if (cooldownMin != null && cooldownMin > 0 && lastShown != null && Number.isFinite(lastShown)) {
    const elapsed = nowMs - lastShown;
    if (elapsed >= 0 && elapsed < cooldownMin * 60_000) {
      return { allowed: false, reason: 'cooldown' };
    }
  }

  if (cap.max_impressions_lifetime != null && cap.max_impressions_lifetime > 0) {
    if (lifetimeCount >= cap.max_impressions_lifetime) {
      return { allowed: false, reason: 'lifetime' };
    }
  }

  if (cap.max_impressions_per_session != null && cap.max_impressions_per_session > 0) {
    if (sessionCount >= cap.max_impressions_per_session) {
      return { allowed: false, reason: 'session' };
    }
  }

  if (cap.max_impressions_per_day != null && cap.max_impressions_per_day > 0) {
    if (dayCount >= cap.max_impressions_per_day) {
      return { allowed: false, reason: 'day' };
    }
  }

  return { allowed: true };
}

/**
 * @param {FrequencyEntityState | null | undefined} prev
 * @param {number} nowMs
 * @returns {FrequencyEntityState}
 */
export function recordFrequencyImpression(prev, nowMs) {
  const todayKey = utcDateString(new Date(nowMs));
  const p = prev && typeof prev === 'object' ? prev : {};
  const sessionCount = Math.max(0, Math.floor(Number(p.sessionCount) || 0)) + 1;
  let dayCount;
  if (p.dayKey === todayKey) {
    dayCount = Math.max(0, Math.floor(Number(p.dayCount) || 0)) + 1;
  } else {
    dayCount = 1;
  }
  const lifetimeCount = Math.max(0, Math.floor(Number(p.lifetimeCount) || 0)) + 1;
  return {
    sessionCount,
    dayKey: todayKey,
    dayCount,
    lastShownAt: nowMs,
    lifetimeCount,
  };
}

/**
 * @param {unknown} raw
 * @returns {{ v: number, scope: string, campaign: Record<string, FrequencyEntityState>, recommendationSet: Record<string, FrequencyEntityState> } | null}
 */
export function parseClientFrequencyState(raw) {
  if (raw == null || raw === '') return null;
  let parsed;
  try {
    const s = typeof raw === 'string' ? decodeURIComponent(raw) : String(raw);
    parsed = typeof raw === 'string' ? JSON.parse(s) : raw;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const v = Number(/** @type {any} */ (parsed).v);
  if (v !== 1) return null;
  const scope = String(/** @type {any} */ (parsed).scope ?? '').slice(0, 200);
  if (!scope) return null;
  const campaign = sanitizeEntityMap(/** @type {any} */ (parsed).campaign);
  const recommendationSet = sanitizeEntityMap(/** @type {any} */ (parsed).recommendationSet);
  return { v: 1, scope, campaign, recommendationSet };
}

function sanitizeEntityMap(map) {
  /** @type {Record<string, FrequencyEntityState>} */
  const out = {};
  if (!map || typeof map !== 'object' || Array.isArray(map)) return out;
  for (const [k, val] of Object.entries(map)) {
    const id = String(k).replace(/\D/g, '');
    if (!id) continue;
    if (!val || typeof val !== 'object') continue;
    const st = /** @type {any} */ (val);
    out[id] = {
      sessionCount: Math.max(0, Math.floor(Number(st.sessionCount) || 0)),
      dayKey: st.dayKey != null ? String(st.dayKey).slice(0, 12) : undefined,
      dayCount: Math.max(0, Math.floor(Number(st.dayCount) || 0)),
      lastShownAt: st.lastShownAt != null ? Number(st.lastShownAt) : undefined,
      lifetimeCount: Math.max(0, Math.floor(Number(st.lifetimeCount) || 0)),
    };
  }
  return out;
}

/**
 * @param {object[]} campaigns
 * @param {ReturnType<typeof parseClientFrequencyState>} freqState
 * @param {number} nowMs
 */
export function filterCampaignsByFrequencyState(campaigns, freqState, nowMs = Date.now()) {
  if (!freqState || !Array.isArray(campaigns)) return campaigns;
  return campaigns.filter((c) => {
    const cap = resolveFrequencyCapForCampaign(c);
    const id = String(c.id);
    const st = freqState.campaign[id];
    const { allowed } = evaluateFrequencyCap(cap, st, nowMs);
    return allowed;
  });
}

/**
 * @param {object[]} sets — serialized recommendation sets (must have `id`)
 * @param {ReturnType<typeof parseClientFrequencyState>} freqState
 * @param {number} nowMs
 */
export function filterRecommendationSetsByFrequencyState(sets, freqState, nowMs = Date.now()) {
  if (!freqState || !Array.isArray(sets)) return sets;
  return sets.filter((s) => {
    const cap = resolveFrequencyCapForRecommendationSet(s);
    const id = String(s.id);
    const st = freqState.recommendationSet[id];
    const { allowed } = evaluateFrequencyCap(cap, st, nowMs);
    return allowed;
  });
}

/**
 * Attach resolved cap to storefront payloads (read-only for clients).
 */
export function attachResolvedFrequencyCapToCampaign(c) {
  if (!c || typeof c !== 'object') return c;
  return {
    ...c,
    frequencyCap: resolveFrequencyCapForCampaign(c),
  };
}

export function attachResolvedFrequencyCapToRecommendationSet(s) {
  if (!s || typeof s !== 'object') return s;
  return {
    ...s,
    frequencyCap: resolveFrequencyCapForRecommendationSet(s),
  };
}
