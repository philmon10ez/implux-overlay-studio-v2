import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeFrequencyCapPayload,
  resolveFrequencyCapForCampaign,
  evaluateFrequencyCap,
  recordFrequencyImpression,
  parseClientFrequencyState,
  filterCampaignsByFrequencyState,
  utcDateString,
} from './frequencyCap.js';

test('sanitizeFrequencyCapPayload clamps and defaults', () => {
  assert.deepEqual(sanitizeFrequencyCapPayload(null), {
    frequency_cap_type: 'none',
    max_impressions_per_session: null,
    max_impressions_per_day: null,
    cooldown_minutes: null,
    max_impressions_lifetime: null,
  });
  const s = sanitizeFrequencyCapPayload({
    frequency_cap_type: 'standard',
    max_impressions_per_session: 3,
    max_impressions_per_day: '2',
    cooldown_minutes: 15,
  });
  assert.equal(s.frequency_cap_type, 'standard');
  assert.equal(s.max_impressions_per_session, 3);
  assert.equal(s.max_impressions_per_day, 2);
  assert.equal(s.cooldown_minutes, 15);
});

test('resolveFrequencyCapForCampaign prefers DB over legacy trigger', () => {
  const a = resolveFrequencyCapForCampaign({
    frequencyCap: { frequency_cap_type: 'standard', max_impressions_per_session: 5 },
    triggerConfig: { frequencyCap: 'once_per_session' },
  });
  assert.equal(a.max_impressions_per_session, 5);
  const b = resolveFrequencyCapForCampaign({
    triggerConfig: { frequencyCap: 'once_per_day' },
  });
  assert.equal(b.max_impressions_per_day, 1);
});

test('evaluateFrequencyCap cooldown blocks before session limit', () => {
  const cap = sanitizeFrequencyCapPayload({
    frequency_cap_type: 'standard',
    max_impressions_per_session: 10,
    cooldown_minutes: 60,
  });
  const now = Date.parse('2026-04-07T12:00:00.000Z');
  const blocked = evaluateFrequencyCap(cap, { sessionCount: 0, lastShownAt: now - 30 * 60_000 }, now);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'cooldown');
  const ok = evaluateFrequencyCap(cap, { sessionCount: 0, lastShownAt: now - 61 * 60_000 }, now);
  assert.equal(ok.allowed, true);
});

test('evaluateFrequencyCap session and day', () => {
  const cap = sanitizeFrequencyCapPayload({
    frequency_cap_type: 'standard',
    max_impressions_per_session: 2,
    max_impressions_per_day: 3,
  });
  const now = Date.parse('2026-04-07T15:00:00.000Z');
  const day = utcDateString(new Date(now));
  assert.equal(
    evaluateFrequencyCap(cap, { sessionCount: 2, dayKey: day, dayCount: 1 }, now).allowed,
    false
  );
  assert.equal(
    evaluateFrequencyCap(cap, { sessionCount: 1, dayKey: day, dayCount: 3 }, now).allowed,
    false
  );
});

test('recordFrequencyImpression rolls day when UTC date changes', () => {
  const t0 = Date.parse('2026-04-07T23:00:00.000Z');
  const first = recordFrequencyImpression({}, t0);
  assert.equal(first.dayCount, 1);
  assert.equal(first.sessionCount, 1);
  const t1 = Date.parse('2026-04-08T01:00:00.000Z');
  const second = recordFrequencyImpression(first, t1);
  assert.equal(second.dayKey, '2026-04-08');
  assert.equal(second.dayCount, 1);
  assert.equal(second.sessionCount, 2);
});

test('parseClientFrequencyState and filterCampaignsByFrequencyState', () => {
  const state = parseClientFrequencyState(
    JSON.stringify({
      v: 1,
      scope: 'v:test',
      campaign: {
        10: { sessionCount: 1, dayKey: '2026-04-07', dayCount: 1, lastShownAt: 0 },
      },
      recommendationSet: {},
    })
  );
  assert.ok(state);
  const campaigns = [
    {
      id: 10,
      frequencyCap: { frequency_cap_type: 'standard', max_impressions_per_session: 1 },
      triggerConfig: {},
    },
    { id: 11, frequencyCap: null, triggerConfig: { frequencyCap: 'always' } },
  ];
  const filtered = filterCampaignsByFrequencyState(campaigns, state, Date.parse('2026-04-07T15:00:00Z'));
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 11);
});
