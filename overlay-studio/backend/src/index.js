/**
 * Implux — Backend (Railway Service 1)
 * Express + Prisma + PostgreSQL
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'implux-backend' });
});

app.listen(PORT, () => {
  console.log(`Implux backend listening on port ${PORT}`);
});
