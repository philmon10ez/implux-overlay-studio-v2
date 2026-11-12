import { authenticate } from '../shopify.server.js';
import prisma from '../db.server.js';
import {
  markMerchantUninstalledOnBackend,
  normalizeShopDomain,
} from '../lib/merchantSync.server.js';

export const action = async ({ request }) => {
  const { topic, shop } = await authenticate.webhook(request);

  if (topic === 'APP_UNINSTALLED' && shop) {
    const shopNorm = normalizeShopDomain(shop);
    await markMerchantUninstalledOnBackend(shop);
    await prisma.session.deleteMany({ where: { shop: shopNorm } }).catch((e) => {
      console.warn('[Implux] session cleanup after uninstall failed:', e?.message || e);
    });
    await prisma.$executeRaw`
      DELETE FROM "OverlaySubmission"
      WHERE lower("shopDomain") = ${shopNorm}
         OR lower("shopDomain") = ${`https://${shopNorm}`}
    `.catch((e) => {
      console.warn('[Implux] overlay submission cleanup after uninstall failed');
    });
  }

  return new Response(null, { status: 200 });
};
