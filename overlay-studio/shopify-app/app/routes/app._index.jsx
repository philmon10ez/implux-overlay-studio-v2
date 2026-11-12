import { json } from '@remix-run/node';
import { useCallback, useState } from 'react';
import { useLoaderData } from '@remix-run/react';
import { Page, Layout, Text, Card, BlockStack, Button, Tabs } from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { Buffer } from 'node:buffer';
import { authenticate } from '../shopify.server.js';
import prisma, { ensureOverlaySubmissionTable } from '../db.server.js';
import { sendOverlayRequestEmail, formatSubmissionOrderId } from '../lib/sendOverlayRequestEmail.server.js';
import OverlayRequestForm from '../components/OverlayRequestForm.jsx';
import ShopCampaignList from '../components/ShopCampaignList.jsx';
import SetupChecklist from '../components/SetupChecklist.jsx';
import { syncMerchantFromSession } from '../lib/merchantSync.server.js';
import { detectImageSignature, imageContentType } from '../lib/imageSignature.server.js';
import {
  buildActivateAppId,
  buildThemeEditorEmbedUrl,
  fetchAppEmbedStatus,
  fetchMerchantSyncStatus,
} from '../lib/onboarding.server.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://your-overlay-studio.vercel.app';

/** Bump ?v= when replacing public/poptek-logo.png so Shopify embedded admin picks up the new asset. */
const POPTEK_LOGO_URL = '/poptek-logo.png?v=dark-tek-2';

/** Lowercase emails allowed to see "Open Campaigns" (Implux dashboard). Empty = hidden for everyone. */
function parseDashboardEmailAllowlist(raw) {
  if (!raw || typeof raw !== 'string') return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

async function fetchShopVendorName(admin) {
  try {
    const res = await admin.graphql(
      `#graphql
      query ImpluxShopVendorName {
        shop {
          name
        }
      }`
    );
    const json = await res.json();
    if (json.errors?.length) {
      console.warn('[Implux] shop.name:', json.errors.map((e) => e.message).join('; '));
      return null;
    }
    const name = json?.data?.shop?.name;
    return typeof name === 'string' && name.trim() ? name.trim() : null;
  } catch (e) {
    console.warn('[Implux] shop.name request failed:', e?.message || e);
    return null;
  }
}

async function getStaffMemberEmail(admin) {
  try {
    const res = await admin.graphql(
      `#graphql
      query ImpluxCurrentStaffMember {
        currentStaffMember {
          email
        }
      }`
    );
    const json = await res.json();
    if (json.errors?.length) {
      console.warn('[Implux] currentStaffMember:', json.errors.map((e) => e.message).join('; '));
      return null;
    }
    const email = json?.data?.currentStaffMember?.email;
    return typeof email === 'string' ? email : null;
  } catch (e) {
    console.warn('[Implux] currentStaffMember request failed:', e?.message || e);
    return null;
  }
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REQUEST_SLOTS = 5;

function safeFilename(name) {
  const base = String(name).split(/[/\\]/).pop() || 'image';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'image.png';
}

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
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
      const kind = detectImageSignature(buf);
      if (!kind) {
        return json(
          {
            ok: false,
            error: `Request ${i + 1}: Images must be JPEG, PNG, or WebP files.`,
          },
          { status: 400 }
        );
      }
      row.imageBuffer = buf;
      row.imageName = safeFilename(file.name);
      row.imageContentType = imageContentType(kind);
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

  const vendorName =
    (await fetchShopVendorName(admin)) ||
    shopNorm.replace('.myshopify.com', '').replace(/-/g, ' ');

  let submissionOrderId;
  try {
    await ensureOverlaySubmissionTable();
    const submission = await prisma.overlaySubmission.create({
      data: {
        shopDomain: shopNorm,
        vendorName,
        rowCount: rows.length,
      },
    });
    submissionOrderId = formatSubmissionOrderId(submission.id);

    try {
      await sendOverlayRequestEmail({
        shop: shopNorm,
        vendorName,
        submissionOrderId,
        rows,
      });
    } catch (emailErr) {
      await prisma.overlaySubmission.delete({ where: { id: submission.id } }).catch(() => {});
      throw emailErr;
    }
  } catch (e) {
    console.error('[Implux] overlay request save/email failed:', e?.message || e);
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
    submissionOrderId,
    message: `Thanks — request ${submissionOrderId} was submitted. Our team will review it shortly.`,
  });
};

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session?.shop || '';

  const allowlist = parseDashboardEmailAllowlist(process.env.IMPLUX_DASHBOARD_ALLOWED_EMAILS || '');
  let showOpenCampaigns = false;
  if (allowlist.size > 0) {
    const staffEmail = await getStaffMemberEmail(admin);
    if (staffEmail && allowlist.has(staffEmail.trim().toLowerCase())) {
      showOpenCampaigns = true;
    }
  }

  const shopLabel = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const storeConnected = Boolean(shop && session?.accessToken);

  await syncMerchantFromSession(prisma, session, 'app_home');

  const merchantSync = shopLabel
    ? await fetchMerchantSyncStatus(prisma, shopLabel)
    : { synced: false, reason: 'no_shop' };

  const embedResult = storeConnected ? await fetchAppEmbedStatus(admin) : { status: 'unavailable' };
  const embedStatus = embedResult.status;

  const activateAppId = buildActivateAppId({
    apiKey: process.env.SHOPIFY_API_KEY,
    themeExtensionIdEnv: process.env.THEME_EXTENSION_ID,
  });
  const themeEditorUrl = buildThemeEditorEmbedUrl(shopLabel, activateAppId);

  const readyForOverlayRequests = storeConnected && merchantSync.synced;

  let activeCampaignCount = 0;
  /** @type {{ id: number, name: string, status: string }[]} */
  let shopCampaigns = [];
  if (shop) {
    const normalized = shop.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(c.id)::int as count
        FROM "Campaign" c
        INNER JOIN "Merchant" m ON c."merchantId" = m.id
        WHERE (m."shopifyDomain" = ${normalized} OR m."shopifyDomain" = ${`https://${normalized}`})
          AND c.status = 'active'
      `;
      activeCampaignCount = result?.[0]?.count ?? 0;
    } catch (e) {
      console.warn('[Implux] active campaign count query failed (non-fatal):', e?.message || e);
    }
    try {
      const rows = await prisma.$queryRaw`
        SELECT c.id, c.name, c.status
        FROM "Campaign" c
        INNER JOIN "Merchant" m ON c."merchantId" = m.id
        WHERE (m."shopifyDomain" = ${normalized} OR m."shopifyDomain" = ${`https://${normalized}`})
          AND c.status IN ('active', 'paused')
        ORDER BY c.name ASC
      `;
      shopCampaigns = Array.isArray(rows)
        ? rows.map((r) => ({
            id: Number(r.id),
            name: String(r.name ?? ''),
            status: String(r.status ?? ''),
          }))
        : [];
    } catch (e) {
      console.warn('[Implux] shop campaigns list query failed (non-fatal):', e?.message || e);
    }
  }

  const vendorName =
    (await fetchShopVendorName(admin)) ||
    shopLabel.replace('.myshopify.com', '').replace(/-/g, ' ');

  return {
    activeCampaignCount,
    shopCampaigns,
    frontendUrl: FRONTEND_URL,
    shopLabel,
    vendorName,
    showOpenCampaigns,
    onboarding: {
      storeConnected,
      merchantSynced: merchantSync.synced,
      embedStatus,
      readyForOverlayRequests,
      themeEditorUrl,
    },
  };
};

const MAIN_TABS = [
  { id: 'overlay-requests', content: 'Overlay submissions', panelID: 'overlay-requests-panel' },
  { id: 'shop-campaigns', content: 'Campaign tracker', panelID: 'shop-campaigns-panel' },
];

export default function AppIndex() {
  const {
    activeCampaignCount,
    shopCampaigns,
    frontendUrl,
    shopLabel,
    vendorName,
    showOpenCampaigns,
    onboarding,
  } = useLoaderData();
  const [selectedTab, setSelectedTab] = useState(0);
  const handleTabChange = useCallback((index) => setSelectedTab(index), []);

  return (
    <Page>
      <TitleBar title="Poptek by Implux" />
      <div className="poptek-shopify-app">
        <div className="poptek-app-header">
          <img src={POPTEK_LOGO_URL} alt="Poptek" />
        </div>
        <BlockStack gap="500">
          <Tabs tabs={MAIN_TABS} selected={selectedTab} onSelect={handleTabChange} fitted>
          {selectedTab === 0 ? (
            <Layout>
              <Layout.Section>
                <SetupChecklist
                  storeConnected={onboarding.storeConnected}
                  merchantSynced={onboarding.merchantSynced}
                  embedStatus={onboarding.embedStatus}
                  readyForOverlayRequests={onboarding.readyForOverlayRequests}
                  themeEditorUrl={onboarding.themeEditorUrl}
                />
              </Layout.Section>
              <Layout.Section>
                <Card>
                  <BlockStack gap="400">
                    <Text as="h1" variant="headingLg">
                      Poptek is active
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Your Poptek team publishes campaigns for this store after you submit overlay requests.
                    </Text>
                    <Text as="p" variant="bodyMd">
                      Active campaigns for this shop: <strong>{activeCampaignCount}</strong>
                    </Text>
                    {showOpenCampaigns ? (
                      <Button url={`${frontendUrl.replace(/\/$/, '')}/campaigns`} variant="primary" external>
                        Open Campaigns
                      </Button>
                    ) : null}
                  </BlockStack>
                </Card>
              </Layout.Section>
              <Layout.Section>
                <OverlayRequestForm shopLabel={shopLabel} vendorName={vendorName} />
              </Layout.Section>
            </Layout>
          ) : (
            <Layout>
              <Layout.Section>
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Active campaigns
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Campaigns your team has published for this store. Green means live; yellow means paused.
                    </Text>
                    <ShopCampaignList campaigns={shopCampaigns} />
                  </BlockStack>
                </Card>
              </Layout.Section>
            </Layout>
          )}
        </Tabs>
        </BlockStack>
      </div>
    </Page>
  );
}
