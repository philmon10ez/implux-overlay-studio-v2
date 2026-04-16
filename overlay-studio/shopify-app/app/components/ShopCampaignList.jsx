import { BlockStack, InlineStack, Text } from '@shopify/polaris';

/** Customer-facing: green = active, yellow = paused (matches Implux campaign status). */
function StatusDot({ status }) {
  const isActive = status === 'active';
  const bg = isActive ? '#008060' : '#FFC453';
  const label = isActive ? 'Active' : 'Paused';
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: bg,
        flexShrink: 0,
        display: 'inline-block',
      }}
      aria-label={label}
      title={label}
    />
  );
}

/**
 * @param {object} props
 * @param {{ id: number, name: string, status: string }[]} props.campaigns
 */
export default function ShopCampaignList({ campaigns }) {
  if (!campaigns?.length) {
    return (
      <Text as="p" variant="bodyMd" tone="subdued">
        No active or paused campaigns for this store yet. When your team publishes campaigns, they will
        appear here.
      </Text>
    );
  }

  return (
    <BlockStack gap="300">
      {campaigns.map((c) => (
        <InlineStack key={c.id} gap="300" blockAlign="center" wrap={false}>
          <StatusDot status={c.status} />
          <Text as="span" variant="bodyMd">
            {c.name}
          </Text>
        </InlineStack>
      ))}
    </BlockStack>
  );
}
