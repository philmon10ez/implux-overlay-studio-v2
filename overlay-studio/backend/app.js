/**
 * Express application factory — used by server.js and integration tests.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.js';
import merchantsRoutes from './routes/merchants.js';
import campaignsRoutes from './routes/campaigns.js';
import analyticsRoutes from './routes/analytics.js';
import rakutenRoutes from './routes/rakuten.js';
import proxyRoutes from './routes/proxy.js';
import shopifySyncRoutes from './routes/shopifySync.js';
import { complianceWebhookHandler, complianceInternalForwardHandler } from './routes/shopifyComplianceWebhooks.js';
import productsRoutes from './routes/products.js';
import recommendationSetsRoutes from './routes/recommendationSets.js';
import recommendationTargetingRoutes from './routes/recommendationTargeting.js';
import conversionIntelligenceRoutes from './routes/conversionIntelligence.js';
import { resolveAppEnv, resolveAdminCorsOrigins } from '../shared/appEnv.js';
import { securityHeaders, privateCache } from './middleware/securityHeaders.js';
import { conversionWebhookHandler } from './routes/proxy.js';
import { scrubErrorForLog } from '../shared/safeLog.js';

/** Admin dashboard origins (cookie auth + CORS). Comma-separated in FRONTEND_URL. */
function normalizeOrigin(o) {
  if (!o || typeof o !== 'string') return '';
  return o.trim().replace(/\/$/, '');
}

const appEnv = resolveAppEnv();
const adminCorsOrigins = resolveAdminCorsOrigins(appEnv, process.env.FRONTEND_URL);

if ((appEnv === 'production' || appEnv === 'preview') && !process.env.FRONTEND_URL) {
  console.warn(
    `[cors] FRONTEND_URL not set for APP_ENV=${appEnv}; using default admin origin(s) only`
  );
}
console.log(`[cors] APP_ENV=${appEnv} — /api allowed admin Origin(s):`, adminCorsOrigins.join(' | '));

const isLocalDev = appEnv === 'development';

/** Vercel staging project + per-deploy preview URLs (hash suffix changes every deploy). */
const STAGING_VERCEL_ADMIN_ORIGIN =
  /^https:\/\/implux-overlay-studio-staging(-[a-z0-9]+)?\.vercel\.app$/i;

function isAllowedAdminOrigin(origin) {
  const n = normalizeOrigin(origin);
  if (adminCorsOrigins.includes(n)) return true;
  if (isLocalDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(n)) return true;
  if (
    (appEnv === 'staging' || appEnv === 'preview') &&
    STAGING_VERCEL_ADMIN_ORIGIN.test(n)
  ) {
    return true;
  }
  return false;
}

const apiCors = cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (isAllowedAdminOrigin(origin)) return callback(null, origin);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
});

const primaryFrontendUrl = adminCorsOrigins[0] || 'http://localhost:5173';

function storefrontCorsOrigin(origin, callback) {
  if (!origin) return callback(null, true);
  if (adminCorsOrigins.includes(normalizeOrigin(origin))) return callback(null, origin);
  if (origin === primaryFrontendUrl) return callback(null, origin);
  if (/^https:\/\/.+\.myshopify\.com$/i.test(origin)) return callback(null, origin);
  if (/^https:\/\//.test(origin)) return callback(null, origin);
  callback(null, false);
}

const proxyCors = cors({
  origin: storefrontCorsOrigin,
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Shopify-Hmac-Sha256'],
});

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(cookieParser());

  // Compliance webhooks: raw body must be preserved for HMAC verification (before express.json()).
  const complianceRawJson = express.raw({ type: 'application/json', limit: '1mb' });
  app
    .route('/webhooks/compliance')
    .post(complianceRawJson, complianceWebhookHandler)
    .all((_req, res) => {
      res.sendStatus(405);
    });

  // Order webhooks must be hashed against Shopify's raw bytes, not a re-serialized body.
  app.post(
    '/proxy/conversion',
    express.raw({ type: 'application/json', limit: '1mb' }),
    conversionWebhookHandler
  );

  app.use(express.json({ limit: '1mb' }));

  app.post('/api/shopify/webhooks/compliance/internal', complianceInternalForwardHandler);

  app.use('/api', privateCache);
  app.use('/api', apiCors);

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'implux-backend' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/merchants', merchantsRoutes);
  app.use('/api/campaigns', campaignsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/rakuten', rakutenRoutes);
  app.use('/api/shopify', shopifySyncRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/recommendation-sets', recommendationSetsRoutes);
  app.use('/api/recommendations', recommendationTargetingRoutes);
  app.use('/api/conversion-intelligence', conversionIntelligenceRoutes);

  app.use(
    '/proxy',
    proxyCors,
    express.json({ limit: '1mb' }),
    proxyRoutes
  );

  app.use((req, res) => {
    const origin = req.headers.origin;
    if (origin && isAllowedAdminOrigin(origin) && String(req.originalUrl || '').startsWith('/api')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err, req, res, _next) => {
    console.error('[http] request_failed', scrubErrorForLog(err));
    const status = Number(err.status ?? err.statusCode ?? 500);
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    const origin = req.headers.origin;
    if (origin && isAllowedAdminOrigin(origin) && String(req.originalUrl || '').startsWith('/api')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
    const clientError = safeStatus >= 500 ? 'Internal server error' : 'Request failed';
    res.status(safeStatus >= 500 ? 500 : safeStatus).json({ error: clientError });
  });

  return app;
}
