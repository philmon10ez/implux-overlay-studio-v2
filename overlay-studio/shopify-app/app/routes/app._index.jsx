import { useLoaderData } from '@remix-run/react';
import { Page, Layout, Text, Card, BlockStack, Button } from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { authenticate } from '../shopify.server.js';
import prisma from '../db.server.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://your-overlay-studio.vercel.app';

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop || '';

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

  return {
    activeCampaignCount,
    frontendUrl: FRONTEND_URL,
  };
};

export default function AppIndex() {
  const { activeCampaignCount, frontendUrl } = useLoaderData();

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
                <Button url={frontendUrl} variant="primary" external>
                  Open Implux Dashboard
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
