import { Badge, BlockStack, Button, Card, InlineStack, List, Text } from '@shopify/polaris';

/**
 * @typedef {'complete' | 'attention' | 'incomplete' | 'unknown'} StepVisual
 */

/**
 * @param {StepVisual} state
 */
function badgeForState(state) {
  switch (state) {
    case 'complete':
      return <Badge tone="success">Done</Badge>;
    case 'attention':
      return <Badge tone="warning">Action needed</Badge>;
    case 'unknown':
      return <Badge tone="info">Verify</Badge>;
    default:
      return <Badge>In progress</Badge>;
  }
}

/**
 * @param {object} props
 * @param {boolean} props.storeConnected
 * @param {boolean} props.merchantSynced
 * @param {'enabled' | 'disabled' | 'not_configured' | 'unavailable'} props.embedStatus
 * @param {boolean} props.readyForOverlayRequests
 * @param {string | null} props.themeEditorUrl
 */
export default function SetupChecklist({
  storeConnected,
  merchantSynced,
  embedStatus,
  readyForOverlayRequests,
  themeEditorUrl,
}) {
  /** @type {StepVisual} */
  let embedVisual = 'incomplete';
  let embedDetail =
    'Turn on the Implux app embed in your theme and save — overlays appear on your storefront after that.';

  if (embedStatus === 'enabled') {
    embedVisual = 'complete';
    embedDetail = 'The Implux app embed is enabled on your live theme.';
  } else if (embedStatus === 'disabled') {
    embedVisual = 'attention';
    embedDetail =
      'The Implux app embed is present but turned off. Open the theme editor, enable it, and save your theme.';
  } else if (embedStatus === 'not_configured') {
    embedVisual = 'attention';
    embedDetail =
      'The Implux app embed is not enabled yet. Use the button below, turn on Implux under App embeds, then save.';
  } else {
    embedVisual = 'unknown';
    embedDetail =
      'We could not confirm embed status from the theme API. Open the theme editor and verify Implux is enabled under App embeds, then save.';
  }

  const steps = [
    {
      title: 'Shopify store connected',
      visual: storeConnected ? 'complete' : 'incomplete',
      detail: storeConnected
        ? 'You installed Poptek and authorized the app in Shopify Admin.'
        : 'Complete the Poptek install from Shopify to connect your store.',
    },
    {
      title: 'Merchant synced to Poptek',
      visual: merchantSynced ? 'complete' : 'incomplete',
      detail: merchantSynced
        ? 'Your store is registered with Poptek so campaigns and overlays can target this shop.'
        : 'Sync runs automatically when you open this app. Refresh this page in a moment if this step is still pending.',
    },
    {
      title: 'Theme app embed',
      visual: embedVisual,
      detail: embedDetail,
    },
    {
      title: 'Ready to submit overlay requests',
      visual: readyForOverlayRequests ? 'complete' : 'incomplete',
      detail: readyForOverlayRequests
        ? 'Use the form below to send overlay requests to the Poptek team.'
        : 'Connect your store and complete sync above to submit overlay requests.',
    },
  ];

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="200">
          <Text as="h2" variant="headingMd">
            Setup checklist
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Simple self-service install — no collaborator access or Shopify security code is needed. You stay in
            control: enable the theme embed and save when Shopify prompts you.
          </Text>
        </BlockStack>

        <List type="number">
          {steps.map((step) => (
            <List.Item key={step.title}>
              <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {step.title}
                  </Text>
                  {badgeForState(step.visual)}
                </InlineStack>
                <Text as="p" variant="bodySm" tone="subdued">
                  {step.detail}
                </Text>
              </BlockStack>
            </List.Item>
          ))}
        </List>

        {themeEditorUrl ? (
          <InlineStack gap="200">
            <Button url={themeEditorUrl} variant="primary" external>
              Enable Poptek overlay
            </Button>
            <Text as="span" variant="bodySm" tone="subdued">
              Opens the theme editor (App embeds). Toggle <strong>Implux</strong>, then click Save.
            </Text>
          </InlineStack>
        ) : (
          <Text as="p" variant="bodySm" tone="caution">
            Theme editor link is not available until the app is fully configured. Contact support if this persists.
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}
