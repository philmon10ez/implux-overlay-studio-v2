import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSubmissionOrderId,
  resolveOverlayRequestRecipients,
  DEFAULT_OVERLAY_REQUEST_RECIPIENTS,
  sendOverlayRequestEmail,
} from './sendOverlayRequestEmail.server.js';

test('formatSubmissionOrderId zero-pads', () => {
  assert.equal(formatSubmissionOrderId(42), '00042');
});

test('resolveOverlayRequestRecipients uses OVERLAY_REQUEST_TO when set', () => {
  const env = { OVERLAY_REQUEST_TO: ' staging@example.com , ops@example.com ' };
  assert.deepEqual(resolveOverlayRequestRecipients(env), ['staging@example.com', 'ops@example.com']);
});

test('resolveOverlayRequestRecipients defaults to Implux team inboxes', () => {
  assert.deepEqual(resolveOverlayRequestRecipients({}), DEFAULT_OVERLAY_REQUEST_RECIPIENTS);
  assert.equal(DEFAULT_OVERLAY_REQUEST_RECIPIENTS.length, 2);
});

test('sendOverlayRequestEmail skips SMTP when EMAIL_ENABLED is false', async () => {
  const prev = { EMAIL_ENABLED: process.env.EMAIL_ENABLED, APP_ENV: process.env.APP_ENV };
  process.env.EMAIL_ENABLED = 'false';
  process.env.APP_ENV = 'staging';

  try {
    const result = await sendOverlayRequestEmail({
      shop: 'demo.myshopify.com',
      vendorName: 'Demo',
      submissionOrderId: '00001',
      rows: [
        {
          sku: 'A',
          upc: '1',
          pageUrl: 'https://example.com/p',
          overlayType: 'banner_strip',
          placement: 'home',
          urgency: 'standard',
        },
      ],
    });
    assert.equal(result.skipped, true);
    assert.equal(result.reason, 'EMAIL_DISABLED');
  } finally {
    process.env.EMAIL_ENABLED = prev.EMAIL_ENABLED;
    process.env.APP_ENV = prev.APP_ENV;
  }
});
