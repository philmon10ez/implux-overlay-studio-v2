import { useEffect, useState } from 'react';
import { useFetcher } from '@remix-run/react';
import {
  BlockStack,
  Banner,
  Button,
  Card,
  Text,
  InlineStack,
} from '@shopify/polaris';
import {
  OVERLAY_TYPE_OPTIONS,
  PLACEMENT_OPTIONS,
  URGENCY_OPTIONS,
} from '../lib/overlayRequestOptions.js';

const MAX_REQUEST_SLOTS = 5;

const fieldStyle = {
  width: '100%',
  marginTop: 6,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #c9cccf',
  fontSize: 14,
  background: '#fff',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

function NativeField({ id, name, label, type = 'text', placeholder, multiline = false }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4, color: '#303030' }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          name={name}
          rows={3}
          placeholder={placeholder}
          autoComplete="off"
          style={{ ...fieldStyle, resize: 'vertical', minHeight: 72 }}
        />
      ) : (
        <input id={id} name={name} type={type} placeholder={placeholder} autoComplete="off" style={fieldStyle} />
      )}
    </div>
  );
}

function NativeSelect({ name, label, options, defaultValue }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={name} style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4, color: '#303030' }}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        style={{
          ...fieldStyle,
          cursor: 'pointer',
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function OverlayRequestForm({ shopLabel, vendorName }) {
  const fetcher = useFetcher();
  const busy = fetcher.state !== 'idle';
  const data = fetcher.data;
  const [formKey, setFormKey] = useState(0);
  const [visibleSlots, setVisibleSlots] = useState(1);

  useEffect(() => {
    if (data?.ok) {
      setFormKey((k) => k + 1);
      setVisibleSlots(1);
    }
  }, [data?.ok]);

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="200">
          <Text as="h2" variant="headingMd">
            Request overlay designs
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Start with one request below, or add up to five. Include SKU, UPC, and the exact page URL for each product.
            Optional reference images help us match your brand. You’ll get a simple confirmation here — our team receives
            the details by email.
          </Text>
          {vendorName ? (
            <Text as="p" variant="bodySm" tone="subdued">
              Vendor: <strong>{vendorName}</strong>
            </Text>
          ) : null}
          {shopLabel ? (
            <Text as="p" variant="bodySm" tone="subdued">
              Store: <strong>{shopLabel}</strong>
            </Text>
          ) : null}
        </BlockStack>

        {data?.ok ? (
          <Banner tone="success" title="Request sent">
            <p>{data.message || 'Thanks — we received your request and will follow up by email if needed.'}</p>
          </Banner>
        ) : null}

        {data?.ok === false && data?.error ? (
          <Banner tone="critical" title="Could not send">
            <p>{data.error}</p>
          </Banner>
        ) : null}

        <fetcher.Form key={formKey} method="post" encType="multipart/form-data">
          <input type="hidden" name="_intent" value="overlay_request" />
          <BlockStack gap="500">
            {Array.from({ length: visibleSlots }, (_, i) => i).map((i) => (
              <Card key={`${formKey}-${i}`} background="bg-surface-secondary">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">
                    Request {i + 1}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    If you fill this request, SKU, UPC, page URL, overlay type, and placement are required.
                  </Text>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0 16px',
                    }}
                  >
                    <NativeField
                      id={`sku_${i}`}
                      name={`sku_${i}`}
                      label="SKU"
                      placeholder="e.g. ABC-123-RED"
                    />
                    <NativeField
                      id={`upc_${i}`}
                      name={`upc_${i}`}
                      label="UPC"
                      placeholder="12-digit barcode"
                    />
                  </div>
                  <NativeField
                    id={`pageUrl_${i}`}
                    name={`pageUrl_${i}`}
                    label="Page URL"
                    type="url"
                    placeholder="https://yourstore.com/products/..."
                  />
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0 16px',
                    }}
                  >
                    <NativeSelect
                      name={`overlayType_${i}`}
                      label="Overlay type"
                      options={OVERLAY_TYPE_OPTIONS}
                      defaultValue={OVERLAY_TYPE_OPTIONS[0].value}
                    />
                    <NativeSelect
                      name={`placement_${i}`}
                      label="Placement"
                      options={PLACEMENT_OPTIONS}
                      defaultValue={PLACEMENT_OPTIONS[0].value}
                    />
                  </div>
                  <NativeSelect
                    name={`urgency_${i}`}
                    label="Timeline"
                    options={URGENCY_OPTIONS}
                    defaultValue="standard"
                  />
                  <NativeField
                    id={`productTitle_${i}`}
                    name={`productTitle_${i}`}
                    label="Product title (optional)"
                    placeholder="As shown in your catalog"
                  />
                  <NativeField
                    id={`notes_${i}`}
                    name={`notes_${i}`}
                    label="Notes (optional)"
                    multiline
                    placeholder="Messaging, promo code, colors, or other context"
                  />
                  <div>
                    <Text as="p" variant="bodySm" fontWeight="medium">
                      Reference image (optional)
                    </Text>
                    <input
                      type="file"
                      name={`image_${i}`}
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      style={{ marginTop: 8, fontSize: 13 }}
                    />
                    <Text as="p" variant="bodySm" tone="subdued">
                      PNG, JPG, WebP, or GIF — max 5 MB per image.
                    </Text>
                  </div>
                </BlockStack>
              </Card>
            ))}

            {visibleSlots < MAX_REQUEST_SLOTS || visibleSlots > 1 ? (
              visibleSlots === 1 ? (
                <Button
                  type="button"
                  onClick={() => setVisibleSlots((n) => Math.min(n + 1, MAX_REQUEST_SLOTS))}
                >
                  Add additional campaign request
                </Button>
              ) : (
                <InlineStack align="space-between" blockAlign="center" gap="400" wrap={false}>
                  <div>
                    {visibleSlots < MAX_REQUEST_SLOTS ? (
                      <Button
                        type="button"
                        onClick={() => setVisibleSlots((n) => Math.min(n + 1, MAX_REQUEST_SLOTS))}
                      >
                        Add additional campaign request
                      </Button>
                    ) : null}
                  </div>
                  <div>
                    <Button
                      type="button"
                      tone="critical"
                      onClick={() => setVisibleSlots((n) => Math.max(1, n - 1))}
                    >
                      Remove campaign
                    </Button>
                  </div>
                </InlineStack>
              )
            ) : null}

            <InlineStack align="end">
              <Button submit variant="primary" loading={busy} disabled={busy}>
                Submit requests
              </Button>
            </InlineStack>
          </BlockStack>
        </fetcher.Form>
      </BlockStack>
    </Card>
  );
}
