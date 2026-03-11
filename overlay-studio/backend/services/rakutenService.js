/**
 * Rakuten Advertising API: auth, advertisers, transactions, sync to DB.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = 'https://api.rakutenadvertising.com';
let accessToken = null;

async function getCredentials() {
  const c = await prisma.rakutenCredentials.findFirst();
  if (!c) throw Object.assign(new Error('Rakuten credentials not configured'), { statusCode: 400 });
  return c;
}

/**
 * POST https://api.rakutenadvertising.com/token — get access token.
 */
export async function authenticate() {
  const creds = await getCredentials();
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });
  const res = await fetch(`${BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw Object.assign(new Error(t || `Token request failed ${res.status}`), { statusCode: res.status });
  }
  const data = await res.json();
  accessToken = data.access_token;
  return !!accessToken;
}

async function ensureAuth() {
  if (!accessToken) await authenticate();
  return accessToken;
}

/**
 * GET /v2/advertisers
 */
export async function getAdvertisers() {
  const token = await ensureAuth();
  const res = await fetch(`${BASE}/v2/advertisers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) {
      accessToken = null;
      await authenticate();
      return getAdvertisers();
    }
    const t = await res.text();
    throw Object.assign(new Error(t || `Advertisers request failed ${res.status}`), { statusCode: res.status });
  }
  const data = await res.json();
  return data?.data ?? data ?? [];
}

/**
 * GET /events/1.0/transactions — fetch transactions for date range.
 */
export async function getTransactions(startDate, endDate) {
  const token = await ensureAuth();
  const creds = await getCredentials();
  const params = new URLSearchParams({
    start_date: startDate.toISOString().slice(0, 10),
    end_date: endDate.toISOString().slice(0, 10),
    publisher_id: creds.publisherId,
  });
  const res = await fetch(`${BASE}/events/1.0/transactions?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) {
      accessToken = null;
      await authenticate();
      return getTransactions(startDate, endDate);
    }
    const t = await res.text();
    throw Object.assign(new Error(t || `Transactions request failed ${res.status}`), { statusCode: res.status });
  }
  const data = await res.json();
  const rows = data?.data ?? data?.transactions ?? (Array.isArray(data) ? data : []);
  return Array.isArray(rows) ? rows : [];
}

/**
 * Sync last 30 days from Rakuten, upsert to DB, match to CampaignEvents, update Campaign.revenueAttributed.
 */
export async function syncTransactions() {
  const creds = await prisma.rakutenCredentials.findFirst();
  if (!creds) return;
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  let rows;
  try {
    rows = await getTransactions(start, end);
  } catch (e) {
    throw e;
  }
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    const orderId = row.order_id ?? row.orderId ?? row.transaction_id ?? row.id?.toString();
    if (!orderId) continue;
    const mid = row.mid ?? row.merchant_id ?? row.advertiser_id ?? '';
    const saleAmount = parseFloat(row.sale_amount ?? row.saleAmount ?? row.amount ?? 0);
    const commissionAmount = parseFloat(row.commission_amount ?? row.commissionAmount ?? row.commission ?? 0);
    const transactionDate = row.transaction_date ? new Date(row.transaction_date) : new Date();
    const status = row.status ?? 'approved';
    await prisma.rakutenTransaction.upsert({
      where: { orderId: String(orderId) },
      create: {
        orderId: String(orderId),
        mid: String(mid),
        saleAmount,
        commissionAmount,
        transactionDate,
        status,
      },
      update: {
        mid: String(mid),
        saleAmount,
        commissionAmount,
        transactionDate,
        status,
      },
    });
  }
  // Match orderIds to CampaignEvents (conversions) and set campaignId on RakutenTransaction, update Campaign.revenueAttributed
  const events = await prisma.campaignEvent.findMany({
    where: { eventType: 'conversion', orderId: { not: null } },
    select: { orderId: true, campaignId: true, orderValue: true },
  });
  const orderToCampaign = new Map();
  for (const e of events) {
    if (e.orderId) orderToCampaign.set(e.orderId, { campaignId: e.campaignId, orderValue: Number(e.orderValue ?? 0) });
  }
  const txs = await prisma.rakutenTransaction.findMany({
    where: { transactionDate: { gte: start, lte: end } },
  });
  for (const tx of txs) {
    const match = orderToCampaign.get(tx.orderId);
    if (match && !tx.campaignId) {
      await prisma.rakutenTransaction.update({
        where: { id: tx.id },
        data: { campaignId: match.campaignId },
      });
      await prisma.campaign.update({
        where: { id: match.campaignId },
        data: { revenueAttributed: { increment: match.orderValue || Number(tx.saleAmount) } },
      });
    }
  }
}
