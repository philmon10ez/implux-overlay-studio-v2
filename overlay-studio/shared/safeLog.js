/**
 * Log scrubbing. Never print the matched secret, only a fixed replacement.
 * @param {unknown} value
 */
export function scrubSensitiveText(value) {
  return String(value ?? '')
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, 'postgres://[redacted]')
    .replace(/\bshpat_[A-Za-z0-9]+\b/g, 'shpat_[redacted]')
    .replace(/\bshpca_[A-Za-z0-9]+\b/g, 'shpca_[redacted]')
    .replace(/\bshpss_[A-Za-z0-9]+\b/g, 'shpss_[redacted]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, 'sk-[redacted]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\b(password|secret|token|authorization)\b\s*[:=]\s*\S+/gi, '$1=[redacted]');
}

/**
 * @param {unknown} err
 */
export function scrubErrorForLog(err) {
  const error = /** @type {{ message?: string, code?: string, name?: string }} */ (err || {});
  return {
    name: error.name || 'Error',
    code: error.code || undefined,
    message: scrubSensitiveText(error.message || 'unknown'),
  };
}
