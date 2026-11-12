import test from 'node:test';
import assert from 'node:assert/strict';
import { detectImageSignature } from './imageSignature.server.js';

test('image signatures accept PNG and reject a renamed executable', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(detectImageSignature(png), 'png');
  assert.equal(detectImageSignature(exe), null);
});
