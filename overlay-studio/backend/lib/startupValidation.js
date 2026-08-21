/**
 * Backend startup validation — runs before the HTTP server listens.
 */
import { resolveAppEnv } from '../../shared/appEnv.js';
import { validateDatabaseUrl } from '../../shared/databaseGuard.js';

export function validateBackendStartup(env = process.env) {
  const appEnv = resolveAppEnv(env);
  validateDatabaseUrl(env);
  console.log(`[startup] APP_ENV=${appEnv}`);
  return appEnv;
}
