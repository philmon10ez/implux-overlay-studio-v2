/**
 * Browser-safe campaign field sanitizers. Injected into overlay-engine.js.
 * Colors, lengths, and URLs are allow-listed before they touch HTML or navigation.
 */

/**
 * @param {unknown} value
 * @param {string} fallback
 */
export function sanitizeCssColor(value, fallback) {
  const text = String(value ?? '').trim();
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(text)) {
    return text;
  }
  const rgb = text.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+)\s*)?\)$/
  );
  if (!rgb) return fallback;
  const channels = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  if (channels.some((channel) => channel > 255)) return fallback;
  if (rgb[4] != null && Number(rgb[4]) > 1) return fallback;
  return text.replace(/\s+/g, '');
}

/**
 * Opacity stored as 0..1.
 * @param {unknown} value
 * @param {number} fallback
 */
export function sanitizeUnitOpacity(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) return fallback;
  return number;
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 */
export function sanitizeCssLength(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

/**
 * Navigation and image URLs. javascript:, data: (except images), and credentials are rejected.
 * @param {unknown} value
 */
export function sanitizeNavigationUrl(value) {
  const text = String(value ?? '').trim();
  if (!text || text.length > 2000) return '';
  if (/[\u0000-\u001f\u007f]/.test(text)) return '';
  let url;
  try {
    url = new URL(text);
  } catch {
    return '';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
  if (url.username || url.password) return '';
  return url.toString();
}

/**
 * @param {unknown} value
 */
export function sanitizeImageUrl(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (text.length > 1500000) return '';
  const dataImage = text.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,([a-z0-9+/=\s]+)$/i);
  if (dataImage) {
    if (/[\u0000-\u001f<>"']/.test(text)) return '';
    return `data:image/${dataImage[1].toLowerCase()};base64,${dataImage[2].replace(/\s+/g, '')}`;
  }
  return sanitizeNavigationUrl(text);
}
