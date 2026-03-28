/**
 * Implux — Backend entry point (Railway)
 * Procfile: web: node server.js
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';

import authRoutes from './routes/auth.js';
import merchantsRoutes from './routes/merchants.js';
import campaignsRoutes from './routes/campaigns.js';
import analyticsRoutes from './routes/analytics.js';
import rakutenRoutes from './routes/rakuten.js';
import proxyRoutes from './routes/proxy.js';
import shopifySyncRoutes from './routes/shopifySync.js';
import { syncTransactions } from './services/rakutenService.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

/** Admin dashboard origins (cookie auth + CORS). Comma-separated in FRONTEND_URL. */
function normalizeOrigin(o) {
  if (!o || typeof o !== 'string') return '';
  return o.trim().replace(/\/$/, '');
}

const prodLike =
  process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
const defaultAdminOrigin = prodLike ? 'https://admin.implux.io' : 'http://localhost:5173';
const adminCorsOrigins = (process.env.FRONTEND_URL || defaultAdminOrigin)
  .split(',')
  .map((s) => normalizeOrigin(s))
  .filter(Boolean);

if (prodLike && !process.env.FRONTEND_URL) {
  console.warn(
    '[cors] FRONTEND_URL not set; allowing default admin origin https://admin.implux.io (set FRONTEND_URL to add alternates, e.g. Vercel preview URLs)'
  );
}

const apiCors = cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const n = normalizeOrigin(origin);
    if (adminCorsOrigins.includes(n)) return callback(null, origin);
    if (!prodLike) {
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(n)) return callback(null, origin);
    }
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

const primaryFrontendUrl = adminCorsOrigins[0] || defaultAdminOrigin;

/** Storefront overlay fetch() runs on *.myshopify.com and merchant custom domains — must echo Origin. */
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

app.use(cookieParser());
app.use(express.json());

// CORS: admin API vs public storefront proxy (different allowed origins)
app.use('/api', apiCors);

// Health (no auth)
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'implux-backend' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/merchants', merchantsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/rakuten', rakutenRoutes);
app.use('/api/shopify', shopifySyncRoutes);

// App proxy — CORS for storefront; capture raw body for webhook HMAC
app.use(
  '/proxy',
  proxyCors,
  express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }),
  proxyRoutes
);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status ?? err.statusCode ?? 500;
  res.status(status).json({
    error: err.message ?? 'Internal server error',
  });
});

// Rakuten sync every 6 hours
cron.schedule('0 */6 * * *', async () => {
  try {
    await syncTransactions();
    console.log('Rakuten sync completed');
  } catch (e) {
    console.error('Rakuten sync failed:', e.message);
  }
});

app.listen(PORT, () => {
  console.log(`Implux backend listening on port ${PORT}`);
});
