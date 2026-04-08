import OverlayPreview from '../../../components/OverlayPreview';
import { TYPES } from '../constants';
import { frequencyCapFormToPayload, frequencyCapPayloadSummary } from '../../../lib/frequencyCapForm';

export default function ReviewStep({
  name,
  merchants,
  merchantId,
  type,
  triggerConfig,
  designConfig,
  promoConfig,
  promoCode,
  frequencyCap,
  saveDraft,
  publish,
  saving,
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
        <p>
          <strong>Name:</strong> {name || '—'}
        </p>
        <p>
          <strong>Merchant:</strong>{' '}
          {merchants.find((m) => m.id === parseInt(merchantId, 10))?.storeName ?? (merchantId || '—')}
        </p>
        <p>
          <strong>Type:</strong> {TYPES.find((t) => t.id === type)?.label ?? (type || '—')}
        </p>
        <p>
          <strong>Promo:</strong> {promoConfig.code || promoCode || 'None'}
        </p>
        <p>
          <strong>Frequency:</strong> {frequencyCapPayloadSummary(frequencyCapFormToPayload(frequencyCap))}
        </p>
        {type === 'upsell_modal' && (triggerConfig.upsellSkuAllowlist || '').trim() ? (
          <p className="mt-2">
            <strong>SKU filter:</strong>{' '}
            <span className="font-mono text-xs whitespace-pre-wrap break-all">
              {(triggerConfig.upsellSkuAllowlist || '').trim()}
            </span>
          </p>
        ) : null}
      </div>
      <div>
        <p className="mb-2 font-medium">Preview</p>
        <OverlayPreview
          designConfig={designConfig}
          className="max-w-lg"
          campaignType={type}
          previewPromoCode={promoConfig.code || promoCode || ''}
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={saveDraft}
          disabled={saving}
          className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Save as Draft
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={saving}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          Publish Campaign
        </button>
      </div>
    </div>
  );
}
