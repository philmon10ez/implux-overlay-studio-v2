import MerchantPreviewChrome from './MerchantPreviewChrome';
import RecommendationWidgetPreview from './RecommendationWidgetPreview';
import { MOCK_MERCHANT, mockPdpPath } from './mockMerchantContext';

const fmtMoney = (n) =>
  typeof n === 'number'
    ? n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '';

/** @param {{ widget: { products: object[], headline: string, subcopy: string, ctaLabel: string, internalSetName: string } }} props */
export default function ProductPagePreview({ widget }) {
  const { pdp, storeDomain, brandName } = MOCK_MERCHANT;
  const path = `${storeDomain}${mockPdpPath()}`;

  return (
    <MerchantPreviewChrome path={path} frameLabel="Product page" brandName={brandName}>
      <div className="bg-gradient-to-b from-slate-50/80 to-white">
        <header className="flex items-center justify-between gap-3 border-b border-gray-200/80 bg-white/90 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-[10px] font-bold text-white">
              NL
            </span>
            <nav className="hidden gap-3 text-[11px] font-medium text-gray-600 sm:flex">
              <span className="cursor-default">Shop</span>
              <span className="cursor-default">Collections</span>
              <span className="cursor-default">Sale</span>
            </nav>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span className="hidden sm:inline">Search</span>
            <span className="rounded-md bg-gray-100 px-2 py-1">Cart · 2</span>
          </div>
        </header>

        <div className="px-3 py-3 sm:px-4 sm:py-4">
          <nav className="text-[10px] text-gray-500" aria-label="Breadcrumb">
            <span className="cursor-default">Home</span>
            <span className="mx-1">/</span>
            <span className="cursor-default">{pdp.category}</span>
            <span className="mx-1">/</span>
            <span className="font-medium text-gray-700">{pdp.productTitle}</span>
          </nav>

          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-6">
            <div className="space-y-2">
              <div className="aspect-[4/5] w-full rounded-xl bg-gradient-to-br from-gray-200 via-gray-100 to-gray-50 ring-1 ring-gray-200/80" />
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-14 w-14 shrink-0 rounded-lg ring-1 ${
                      i === 0 ? 'ring-poptek-action/40' : 'ring-gray-200/80'
                    } bg-gray-100`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3 lg:pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-poptek-action/90">{pdp.category}</p>
              <h1 className="text-lg font-bold leading-tight text-gray-900 sm:text-xl">{pdp.productTitle}</h1>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-xl font-semibold text-gray-900">{fmtMoney(pdp.price)}</span>
                {pdp.compareAt ? (
                  <span className="text-sm text-gray-400 line-through">{fmtMoney(pdp.compareAt)}</span>
                ) : null}
              </div>
              <p className="text-xs leading-relaxed text-gray-600">
                Heavyweight Italian wool, raglan sleeves, and a relaxed silhouette. Model is 6&apos;1&quot; wearing
                size M.
              </p>
              <div className="flex flex-wrap gap-2">
                {['XS', 'S', 'M', 'L', 'XL'].map((s, idx) => (
                  <span
                    key={s}
                    className={`cursor-default rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      idx === 2 ? 'border-poptek-action bg-poptek-action/10 text-poptek-action' : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    {s}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="cursor-default rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white"
                >
                  Add to cart
                </button>
                <button
                  type="button"
                  className="cursor-default rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-800"
                >
                  Save
                </button>
              </div>
              <ul className="list-inside list-disc space-y-1 pt-2 text-[11px] text-gray-600">
                <li>Free returns within 30 days</li>
                <li>Ships in 1–2 business days</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-200 pt-6">
            <RecommendationWidgetPreview
              {...widget}
              density="comfortable"
              sectionTitle="You may also like"
            />
          </div>
        </div>
      </div>
    </MerchantPreviewChrome>
  );
}
