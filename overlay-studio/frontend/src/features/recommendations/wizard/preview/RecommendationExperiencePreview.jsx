import { useMemo } from 'react';
import { placementLabel } from '../../constants';
import PreviewRulesStrip from './PreviewRulesStrip';
import ProductPagePreview from './ProductPagePreview';
import CartPagePreview from './CartPagePreview';
import CheckoutPagePreview from './CheckoutPagePreview';

/**
 * Orchestrates mock merchant pages + live recommendation widget + rules/frequency context.
 * @param {object} props
 * @param {'product_page' | 'cart' | 'checkout'} props.placementType
 * @param {{ id?: string|number, title?: string, imageUrl?: string, sku?: string }[]} props.products
 * @param {string} props.headline
 * @param {string} props.subcopy
 * @param {string} props.ctaLabel
 * @param {string} props.internalSetName
 * @param {string} props.triggerJson
 * @param {object} props.frequencyCap
 */
export default function RecommendationExperiencePreview({
  placementType,
  products,
  headline,
  subcopy,
  ctaLabel,
  internalSetName,
  triggerJson,
  frequencyCap,
}) {
  const widget = useMemo(
    () => ({
      products: Array.isArray(products) ? products : [],
      headline,
      subcopy,
      ctaLabel,
      internalSetName,
    }),
    [products, headline, subcopy, ctaLabel, internalSetName]
  );

  const page =
    placementType === 'cart' ? (
      <CartPagePreview widget={widget} />
    ) : placementType === 'checkout' ? (
      <CheckoutPagePreview widget={widget} />
    ) : (
      <ProductPagePreview widget={widget} />
    );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Live preview</h3>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-600">
          {placementLabel(placementType)}
        </span>
      </div>
      <PreviewRulesStrip placementType={placementType} triggerJson={triggerJson} frequencyCap={frequencyCap} />
      <div className="min-h-0 flex-1">{page}</div>
      <p className="text-center text-[10px] leading-relaxed text-gray-500">
        Interactive preview — your live theme will differ. Rules use the sample PDP/cart context shown above.
      </p>
    </div>
  );
}
