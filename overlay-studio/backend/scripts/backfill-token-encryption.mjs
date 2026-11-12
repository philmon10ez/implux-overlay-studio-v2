#!/usr/bin/env node
/**
 * Encrypt existing plaintext Shopify and Rakuten secrets.
 * Dry-run unless CONFIRM_TOKEN_BACKFILL=YES.
 * Refuses production unless CONFIRM_PRODUCTION_TOKEN_BACKFILL=YES.
 * Does not print secret values.
 */
import { PrismaClient } from '@prisma/client';
import { encryptForStorage, encryptionConfigured, isCiphertext } from '../../shared/tokenCipher.js';

const appEnv = String(process.env.APP_ENV || '').trim().toLowerCase();
if (!encryptionConfigured()) {
  console.error('TOKEN_ENCRYPTION_KEY is not configured. Refusing to backfill.');
  process.exit(1);
}
if (process.env.CONFIRM_TOKEN_BACKFILL !== 'YES') {
  console.error('Set CONFIRM_TOKEN_BACKFILL=YES to write ciphertext. This run will only count rows.');
}
if (appEnv === 'production' && process.env.CONFIRM_PRODUCTION_TOKEN_BACKFILL !== 'YES') {
  console.error('Refusing a production backfill without CONFIRM_PRODUCTION_TOKEN_BACKFILL=YES.');
  process.exit(1);
}

const write = process.env.CONFIRM_TOKEN_BACKFILL === 'YES' && (appEnv !== 'production' || process.env.CONFIRM_PRODUCTION_TOKEN_BACKFILL === 'YES');
const prisma = new PrismaClient();

function protect(value) {
  if (!value || isCiphertext(value)) return value;
  return encryptForStorage(value);
}

const merchants = await prisma.merchant.findMany({ select: { id: true, accessToken: true } });
const rakuten = await prisma.rakutenCredentials.findMany({
  select: { id: true, clientSecret: true, securityToken: true },
});

let merchantUpdates = 0;
for (const merchant of merchants) {
  if (!merchant.accessToken || isCiphertext(merchant.accessToken)) continue;
  merchantUpdates += 1;
  if (write) {
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { accessToken: protect(merchant.accessToken) },
    });
  }
}

let rakutenUpdates = 0;
for (const row of rakuten) {
  const clientSecret = protect(row.clientSecret);
  const securityToken = protect(row.securityToken);
  if (clientSecret === row.clientSecret && securityToken === row.securityToken) continue;
  rakutenUpdates += 1;
  if (write) {
    await prisma.rakutenCredentials.update({
      where: { id: row.id },
      data: { clientSecret, securityToken },
    });
  }
}

console.log(
  JSON.stringify({
    mode: write ? 'write' : 'dry-run',
    appEnv: appEnv || 'unset',
    merchantsConsidered: merchants.length,
    merchantPlaintextRows: merchantUpdates,
    rakutenPlaintextRows: rakutenUpdates,
    sessionTable: 'Encrypt sessions by opening the Shopify app after the key is set, or rotate tokens. This script does not read Session.accessToken.',
  })
);

await prisma.$disconnect();
