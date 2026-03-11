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
import { syncTransactions } from './services/rakutenService.js';

const app = express();
const PORT = process.env.PORT ?? 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS — allow Vercel frontend
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(cookieParser());
app.use(express.json());

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

// App proxy — capture raw body for webhook HMAC, then HMAC verified (no JWT)
app.use(
  '/proxy',
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
