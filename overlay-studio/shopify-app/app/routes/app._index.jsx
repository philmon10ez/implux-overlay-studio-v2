import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Page, Layout, Text, Card, BlockStack, Button } from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { Buffer } from 'node:buffer';
import { authenticate } from '../shopify.server.js';
import prisma from '../db.server.js';
import { sendOverlayRequestEmail } from '../lib/sendOverlayRequestEmail.server.js';
import OverlayRequestForm from '../components/OverlayRequestForm.jsx';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://your-overlay-studio.vercel.app';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REQUEST_SLOTS = 5;

function safeFilename(name) {
  const base = String(name).split(/[/\\]/).pop() || 'image';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'image.png';
}

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop || 'unknown';
  const shopNorm = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const formData = await request.formData();
  const intent = String(formData.get('_intent') || '');
  if (intent !== 'overlay_request') {
    return json({ ok: false, error: 'Invalid form.' }, { status: 400 });
  }

  const rows = [];

  for (let i = 0; i < MAX_REQUEST_SLOTS; i++) {
    const sku = String(formData.get(`sku_${i}`) ?? '').trim();
    const upc = String(formData.get(`upc_${i}`) ?? '').trim();
    const pageUrl = String(formData.get(`pageUrl_${i}`) ?? '').trim();
    const overlayType = String(formData.get(`overlayType_${i}`) ?? '').trim();
    const placement = String(formData.get(`placement_${i}`) ?? '').trim();
    const urgency = String(formData.get(`urgency_${i}`) ?? '').trim() || 'standard';
    const productTitle = String(formData.get(`productTitle_${i}`) ?? '').trim();
    const notes = String(formData.get(`notes_${i}`) ?? '').trim();

    const empty = !sku && !upc && !pageUrl && !productTitle && !notes;
    if (empty) continue;

    if (!sku || !upc || !pageUrl) {
      return json(
        {
          ok: false,
          error: `Request ${i + 1}: SKU, UPC, and page URL are required for each row you start.`,
        },
        { status: 400 }
      );
    }

    try {
      const u = new URL(pageUrl);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad proto');
    } catch {
      return json(
        {
          ok: false,
          error: `Request ${i + 1}: Page URL must be a valid http(s) link.`,
        },
        { status: 400 }
      );
    }

    if (!overlayType || !placement) {
      return json(
        {
          ok: false,
          error: `Request ${i + 1}: Choose overlay type and placement.`,
        },
        { status: 400 }
      );
    }

    const file = formData.get(`image_${i}`);
    /** @type {{ sku: string, upc: string, pageUrl: string, overlayType: string, placement: string, urgency: string, productTitle?: string, notes?: string, imageName?: string, imageBuffer?: Buffer }} */
    const row = {
      sku,
      upc,
      pageUrl,
      overlayType,
      placement,
      urgency,
      productTitle: productTitle || undefined,
      notes: notes || undefined,
    };

    if (file && typeof file !== 'string' && file.size > 0) {
      if (file.size > MAX_IMAGE_BYTES) {
        return json(
          {
            ok: false,
            error: `Request ${i + 1}: Each image must be 5 MB or smaller.`,
          },
          { status: 400 }
        );
      }
      const buf = Buffer.from(await file.arrayBuffer());
      row.imageBuffer = buf;
      row.imageName = safeFilename(file.name);
    }

    rows.push(row);
  }

  if (rows.length === 0) {
    return json(
      {
        ok: false,
        error: 'Add at least one complete request with SKU, UPC, and page URL.',
      },
      { status: 400 }
    );
  }

  try {
    await sendOverlayRequestEmail({ shop: shopNorm, rows });
  } catch (e) {
    console.error('[Implux] overlay request email failed:', e?.message || e);
    return json(
      {
        ok: false,
        error: e?.message || 'Could not send your request. Please try again or contact support.',
      },
      { status: 500 }
    );
  }

  return json({
    ok: true,
    message: 'Thanks — your overlay request was submitted. Our team will review it shortly.',
  });
};

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop || '';

  // Sync this shop to Implux backend when the app is opened (covers installs that missed afterAuth or reinstall)
  const backendUrl = (process.env.IMPLUX_BACKEND_URL || process.env.BACKEND_API_URL || '').replace(/\/$/, '');
  const syncSecret = process.env.MERCHANT_SYNC_SECRET;
  let accessToken = session?.accessToken;
  if (!accessToken && shop) {
    const shopNorm = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const dbSession = await prisma.session.findFirst({
      where: { shop: shopNorm },
    });
    accessToken = dbSession?.accessToken || null;
  }
  if (backendUrl && syncSecret && shop && accessToken) {
    try {
      const shopNormalized = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const res = await fetch(`${backendUrl}/api/shopify/sync-merchant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-implux-merchant-sync-secret': syncSecret,
        },
        body: JSON.stringify({
          shop: shopNormalized,
          accessToken,
          storeName: shopNormalized.replace('.myshopify.com', '').replace(/-/g, ' '),
        }),
      });
      if (res.ok) {
        console.log('[Implux] Merchant sync on app load OK for', shopNormalized);
      } else {
        console.warn('[Implux] Merchant sync on app load failed:', res.status, await res.text());
      }
    } catch (e) {
      console.warn('[Implux] Merchant sync on app load error:', e?.message);
    }
  } else if (shop && backendUrl && syncSecret) {
    console.warn('[Implux] Merchant sync on app load skipped (no token):', {
      shop,
      hasBackendUrl: !!backendUrl,
      hasSyncSecret: !!syncSecret,
      hasToken: !!accessToken,
    });
  }

  let activeCampaignCount = 0;
  if (shop) {
    const normalized = shop.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const result = await prisma.$queryRaw`
      SELECT COUNT(c.id)::int as count
      FROM "Campaign" c
      INNER JOIN "Merchant" m ON c."merchantId" = m.id
      WHERE (m."shopifyDomain" = ${normalized} OR m."shopifyDomain" = ${`https://${normalized}`})
        AND c.status = 'active'
    `;
    activeCampaignCount = result?.[0]?.count ?? 0;
  }

  const shopLabel = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return {
    activeCampaignCount,
    frontendUrl: FRONTEND_URL,
    shopLabel,
  };
};

export default function AppIndex() {
  const { activeCampaignCount, frontendUrl, shopLabel } = useLoaderData();

  return (
    <Page>
      <TitleBar title="Implux.io" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h1" variant="headingLg">
                  Implux is active
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Your campaigns are managed from your Implux dashboard.
                </Text>
                <Text as="p" variant="bodyMd">
                  Active campaigns for this shop: <strong>{activeCampaignCount}</strong>
                </Text>
                <Button url={`${frontendUrl.replace(/\/$/, '')}/campaigns`} variant="primary" external>
                  Open Campaigns (admin.implux.io)
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section>
            <OverlayRequestForm shopLabel={shopLabel} />
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
