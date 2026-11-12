/**
 * JPEG, PNG, and WebP detection by file signature.
 * @param {Buffer | Uint8Array | null | undefined} input
 * @returns {'jpeg' | 'png' | 'webp' | null}
 */
export function detectImageSignature(input) {
  if (!input || input.length < 12) return null;
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'png';
  }
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp';
  }
  return null;
}

/** @param {'jpeg' | 'png' | 'webp'} kind */
export function imageContentType(kind) {
  if (kind === 'jpeg') return 'image/jpeg';
  if (kind === 'png') return 'image/png';
  return 'image/webp';
}
