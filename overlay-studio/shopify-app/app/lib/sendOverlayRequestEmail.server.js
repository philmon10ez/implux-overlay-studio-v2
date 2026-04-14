/**
 * Sends overlay request emails via SMTP (Zoho: smtp.zoho.com or smtp.zoho.eu).
 *
 * Set SMTP_USER, SMTP_PASS, and optionally SMTP_FROM, SMTP_HOST, SMTP_PORT in the app environment.
 */
import { Buffer } from 'node:buffer';
import nodemailer from 'nodemailer';
import {
  OVERLAY_TYPE_OPTIONS,
  PLACEMENT_OPTIONS,
  URGENCY_OPTIONS,
  labelByValue,
} from './overlayRequestOptions.js';

const DEFAULT_RECIPIENTS = ['matth@implux.io', 'philip.m@implux.io'];

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 5+ digit zero-padded order id (global sequence). */
export function formatSubmissionOrderId(id) {
  return String(Math.max(0, Number(id) || 0)).padStart(5, '0');
}

function buildHtmlBody({
  shop,
  vendorName,
  submissionOrderId,
  rows,
}) {
  const vendorEsc = escapeHtml(vendorName);
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
    <p>The Vendor <strong>${vendorEsc}</strong> has requested the following overlays.</p>
    <p style="font-size:14px;color:#444;"><strong>Order ID:</strong> ${escapeHtml(submissionOrderId)} &nbsp;|&nbsp; <strong>Shop:</strong> ${shopEsc}</p>
    <p><strong>Requests in this submission:</strong> ${rows.length}</p>
    ${blocks}
    <p style="font-size:12px;color:#888;">Submitted from the Implux Shopify app.</p>
  </body></html>`;
}

function buildTextBody({
  shop,
  vendorName,
  submissionOrderId,
  rows,
}) {
  const lines = [
    `The Vendor ${vendorName} has requested the following overlays.`,
    '',
    `Order ID: ${submissionOrderId}`,
    `Shop: ${shop}`,
    `Requests in this submission: ${rows.length}`,
    '',
  ];
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

function getSmtpTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    return null;
  }
  const host = process.env.SMTP_HOST || 'smtp.zoho.com';
  const port = Number(process.env.SMTP_PORT || '465');
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === 'true'
      : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

/**
 * @param {object} opts
 * @param {string} opts.shop
 * @param {string} opts.vendorName - Shopify shop display name
 * @param {string} opts.submissionOrderId - zero-padded global order id
 * @param {Array<object>} opts.rows - parsed request rows (image as buffer + imageName optional)
 */
export async function sendOverlayRequestEmail({ shop, vendorName, submissionOrderId, rows }) {
  const transport = getSmtpTransport();
  const from =
    process.env.SMTP_FROM ||
    (process.env.SMTP_USER ? `Implux Requests <${process.env.SMTP_USER}>` : null);

  const toRaw = process.env.OVERLAY_REQUEST_TO;
  const recipients = toRaw
    ? toRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : DEFAULT_RECIPIENTS;

  if (!transport || !from) {
    throw new Error(
      'Email is not configured: set SMTP_USER and SMTP_PASS (Zoho mailbox + app password) on the Shopify app service, optionally SMTP_FROM and SMTP_HOST/SMTP_PORT, then redeploy. Recipients default to matth@implux.io and philip.m@implux.io unless OVERLAY_REQUEST_TO is set.'
    );
  }

  const subject = `(${vendorName}) - Overlay Request ${submissionOrderId}`;

  const html = buildHtmlBody({ shop, vendorName, submissionOrderId, rows });
  const text = buildTextBody({ shop, vendorName, submissionOrderId, rows });

  const attachments = [];
  rows.forEach((r, i) => {
    if (r.imageBuffer && r.imageName) {
      attachments.push({
        filename: `${submissionOrderId}-request-${i + 1}-${r.imageName}`,
        content: Buffer.from(r.imageBuffer),
      });
    }
  });

  try {
    const info = await transport.sendMail({
      from,
      to: recipients,
      subject,
      text,
      html,
      attachments: attachments.length ? attachments : undefined,
    });
    return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'responseCode' in err ? err.responseCode : '';
    console.error('[Implux] SMTP error:', msg, code);
    throw new Error(
      `Email could not be sent${code ? ` (${code})` : ''}. ${msg} — Check Zoho SMTP settings, app password, and that "From" matches your Zoho mailbox or an allowed alias.`
    );
  }
}
