import test from 'node:test';
import { assertServicePackages } from '../../scripts/verify-service-layout.mjs';

test('Railway service roots package every shared module they import', () => {
  assertServicePackages();
});
