/**
 * Sends formatted overlay creation requests via Resend (https://resend.com).
 * Set RESEND_API_KEY and RESEND_FROM in the Shopify app environment.
 */
import { Buffer } from 'node:buffer';
import {
  OVERLAY_TYPE_OPTIONS,
  PLACEMENT_OPTIONS,
  URGENCY_OPTIONS,
  labelByValue,
} from './overlayRequestOptions.js';

const RESEND_API = 'https://api.resend.com/emails';

const DEFAULT_RECIPIENTS = ['matth@implux.io', 'philip.m@implux.io'];

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtmlBody(shop, rows) {
  const shopEsc = escapeHtml(shop);
  let blocks = '';
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const ot = labelByValue(OVERLAY_TYPE_OPTIONS, r.overlayType);
    const pl = labelByValue(PLACEMENT_OPTIONS, r.placement);
    const ur = labelByValue(URGENCY_OPTIONS, r.urgency);
    blocks += `
      <div style="margin-bottom:28px;padding:16px;border:1px solid #e3e3e3;border-radius:8px;background:#fafafa;">
        <h2 style="margin:0 0 12px;font-size:16px;">Request ${i + 1}</h2>
        <table style="border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;color:#666;">SKU</td><td><strong>${escapeHtml(r.sku)}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">UPC</td><td><strong>${escapeHtml(r.upc)}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Page URL</td><td><a href="${escapeHtml(r.pageUrl)}">${escapeHtml(r.pageUrl)}</a></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Overlay type</td><td>${escapeHtml(ot)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Placement</td><td>${escapeHtml(pl)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Timeline</td><td>${escapeHtml(ur)}</td></tr>
          ${r.productTitle ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Product title</td><td>${escapeHtml(r.productTitle)}</td></tr>` : ''}
          ${r.notes ? `<tr><td style="padding:4px 12px 4px 0;vertical-align:top;color:#666;">Notes</td><td>${escapeHtml(r.notes).replace(/\n/g, '<br/>')}</td></tr>` : ''}
          ${r.imageName ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Reference image</td><td>${escapeHtml(r.imageName)} (attached)</td></tr>` : ''}
        </table>
      </div>`;
  }
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;">
    <p><strong>Shop:</strong> ${shopEsc}</p>
    <p><strong>Requests:</strong> ${rows.length}</p>
    ${blocks}
    <p style="font-size:12px;color:#888;">Submitted from the Implux Shopify app.</p>
  </body></html>`;
}

function buildTextBody(shop, rows) {
  const lines = [`Shop: ${shop}`, `Requests: ${rows.length}`, ''];
  rows.forEach((r, i) => {
    lines.push(`--- Request ${i + 1} ---`);
    lines.push(`SKU: ${r.sku}`);
    lines.push(`UPC: ${r.upc}`);
    lines.push(`Page URL: ${r.pageUrl}`);
    lines.push(`Overlay type: ${labelByValue(OVERLAY_TYPE_OPTIONS, r.overlayType)}`);
    lines.push(`Placement: ${labelByValue(PLACEMENT_OPTIONS, r.placement)}`);
    lines.push(`Timeline: ${labelByValue(URGENCY_OPTIONS, r.urgency)}`);
    if (r.productTitle) lines.push(`Product title: ${r.productTitle}`);
    if (r.notes) lines.push(`Notes: ${r.notes}`);
    if (r.imageName) lines.push(`Reference image: ${r.imageName} (see attachment)`);
    lines.push('');
  });
  return lines.join('\n');
}

/**
 * @param {object} opts
 * @param {string} opts.shop
 * @param {Array<object>} opts.rows - parsed request rows (image as buffer + imageName optional)
 */
export async function sendOverlayRequestEmail({ shop, rows }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'Implux <onboarding@resend.dev>';
  const toRaw = process.env.OVERLAY_REQUEST_TO;
  const recipients = toRaw
    ? toRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : DEFAULT_RECIPIENTS;

  if (!apiKey) {
    throw new Error('Email is not configured (RESEND_API_KEY). Ask your Implux contact.');
  }

  const html = buildHtmlBody(shop, rows);
  const text = buildTextBody(shop, rows);

  /** @type {{ filename: string, content: string }[]} */
  const attachments = [];
  rows.forEach((r, i) => {
    if (r.imageBuffer && r.imageName) {
      attachments.push({
        filename: `request-${i + 1}-${r.imageName}`,
        content: Buffer.from(r.imageBuffer).toString('base64'),
      });
    }
  });

  const payload = {
    from,
    to: recipients,
    subject: `[Implux overlay] ${shop} — ${rows.length} request(s)`,
    html,
    text,
  };
  if (attachments.length) {
    payload.attachments = attachments;
  }

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  if (!res.ok) {
    console.error('[Implux] Resend error:', res.status, raw);
    throw new Error('Could not send your request. Please try again shortly.');
  }
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
