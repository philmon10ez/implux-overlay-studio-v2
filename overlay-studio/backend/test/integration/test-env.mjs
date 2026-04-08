/**
 * Load before createApp so auth middleware sees JWT_SECRET.
 */
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'integration-test-jwt-secret-do-not-use-in-prod';
}
