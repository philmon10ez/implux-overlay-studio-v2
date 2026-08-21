#!/usr/bin/env node
/**
 * Refuse ambiguous Shopify deploys — environment must be explicit.
 */
console.error(`
Poptek Shopify deploy requires an explicit environment.

  npm run deploy:staging     → staging Shopify app (shopify.app.staging.toml)
  npm run deploy:production  → LIVE production app (requires CONFIRM_PRODUCTION_DEPLOY=YES)

Generic "npm run deploy" is intentionally disabled to prevent accidental production deploys.
`);
process.exit(1);
