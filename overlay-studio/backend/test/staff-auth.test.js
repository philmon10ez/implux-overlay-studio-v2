import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import {
  authenticateStaffToken,
  signStaffToken,
  staffPasswordVersion,
} from '../lib/staffAuth.js';
import { createLoginGuard, completeLogin, INVALID_LOGIN } from '../routes/auth.js';

const SECRET = 'test-jwt-secret-for-staff-sessions';

function user(overrides = {}) {
  return {
    id: 1,
    email: 'admin@implux.io',
    role: 'admin',
    password: overrides.password || '$2b$10$unused',
    ...overrides,
  };
}

test('deleted staff user is rejected', async () => {
  const password = await bcrypt.hash('correct-horse-battery', 12);
  const token = signStaffToken(user({ password }), SECRET);
  const result = await authenticateStaffToken(token, {
    jwtSecret: SECRET,
    findUser: async () => null,
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test('password change revokes the previous session', async () => {
  const password = await bcrypt.hash('correct-horse-battery', 12);
  const token = signStaffToken(user({ password }), SECRET);
  const changed = await bcrypt.hash('another-long-password', 12);
  assert.notEqual(staffPasswordVersion(password), staffPasswordVersion(changed));
  const result = await authenticateStaffToken(token, {
    jwtSecret: SECRET,
    findUser: async () => user({ password: changed }),
  });
  assert.equal(result.status, 401);
});

test('non-admin role is rejected', async () => {
  const password = await bcrypt.hash('correct-horse-battery', 12);
  const token = signStaffToken(user({ password, role: 'admin' }), SECRET);
  const result = await authenticateStaffToken(token, {
    jwtSecret: SECRET,
    findUser: async () => user({ password, role: 'merchant' }),
  });
  assert.equal(result.status, 403);
});

test('expired token is rejected', async () => {
  const jwt = await import('jsonwebtoken');
  const token = jwt.default.sign(
    { id: 1, email: 'admin@implux.io', role: 'admin', pv: 'abc', aud: 'implux-staff' },
    SECRET,
    { expiresIn: -1 }
  );
  const result = await authenticateStaffToken(token, {
    jwtSecret: SECRET,
    findUser: async () => user(),
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test('unknown user and bad password return the same body', async () => {
  const password = await bcrypt.hash('correct-horse-battery', 4);
  const db = {
    user: {
      findFirst: async ({ where }) => {
        const email = where.OR[1].email;
        if (email === 'admin@implux.io') return user({ password, email });
        return null;
      },
    },
  };
  const unknown = await completeLogin({
    body: { email: 'missing@implux.io', password: 'nope' },
    db,
    secret: SECRET,
  });
  const wrong = await completeLogin({
    body: { email: 'admin@implux.io', password: 'nope' },
    db,
    secret: SECRET,
  });
  assert.equal(unknown.status, 401);
  assert.equal(wrong.status, 401);
  assert.deepEqual(unknown.body, INVALID_LOGIN);
  assert.deepEqual(wrong.body, INVALID_LOGIN);
});

test('login rate limit returns a blocked decision after the threshold', () => {
  const previous = process.env.LOGIN_RATE_LIMIT;
  const previousWindow = process.env.LOGIN_RATE_WINDOW_MS;
  process.env.LOGIN_RATE_LIMIT = '3';
  process.env.LOGIN_RATE_WINDOW_MS = '60000';
  const guard = createLoginGuard();
  try {
    assert.equal(guard.consume('203.0.113.5', 1_000).ok, true);
    assert.equal(guard.consume('203.0.113.5', 1_100).ok, true);
    assert.equal(guard.consume('203.0.113.5', 1_200).ok, true);
    const blocked = guard.consume('203.0.113.5', 1_300);
    assert.equal(blocked.ok, false);
    assert.equal(guard.consume('203.0.113.9', 1_300).ok, true);
  } finally {
    if (previous === undefined) delete process.env.LOGIN_RATE_LIMIT;
    else process.env.LOGIN_RATE_LIMIT = previous;
    if (previousWindow === undefined) delete process.env.LOGIN_RATE_WINDOW_MS;
    else process.env.LOGIN_RATE_WINDOW_MS = previousWindow;
  }
});
