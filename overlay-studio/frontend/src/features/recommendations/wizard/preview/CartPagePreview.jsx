import MerchantPreviewChrome from './MerchantPreviewChrome';
import RecommendationWidgetPreview from './RecommendationWidgetPreview';
import { MOCK_MERCHANT } from './mockMerchantContext';

const fmtMoney = (n) =>
  typeof n === 'number'
    ? n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '';

export default function CartPagePreview({ widget }) {
  const { storeDomain, brandName, cart } = MOCK_MERCHANT;
  const path = `${storeDomain}/cart`;

  return (
    <MerchantPreviewChrome path={path} frameLabel="Cart" brandName={brandName}>
      <div className="bg-gradient-to-b from-gray-50/90 to-white">
        <header className="flex items-center justify-between border-b border-gray-200/80 bg-white/90 px-3 py-2.5 sm:px-4">
          <span className="text-[11px] font-semibold text-gray-900">{brandName}</span>
          <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] text-gray-600">Checkout</span>
        </header>

        <div className="px-3 py-4 sm:px-4">
          <h1 className="text-base font-bold text-gray-900">Your cart</h1>
          <p className="mt-0.5 text-[11px] text-gray-500">{cart.lines.length} items · subtotal {fmtMoney(cart.subtotal)}</p>

          <ul className="mt-4 space-y-3">
            {cart.lines.map((line) => (
              <li
                key={line.sku}
                className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
              >
                <div className="h-16 w-16 shrink-0 rounded-lg bg-gradient-to-br from-gray-200 to-gray-100 ring-1 ring-gray-200/80" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{line.title}</p>
                  <p className="mt-0.5 text-[10px] text-gray-500">SKU {line.sku}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-700">
                    <span className="cursor-default rounded border border-gray-200 px-2 py-0.5">Qty {line.qty}</span>
                    <span className="font-medium">{fmtMoney(line.linePrice)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex justify-between text-sm text-gray-700">
              <span>Subtotal</span>
              <span className="font-semibold">{fmtMoney(cart.subtotal)}</span>
            </div>
            <p className="mt-2 text-[10px] text-gray-500">Taxes and shipping calculated at checkout.</p>
            <button
              type="button"
              className="mt-3 w-full cursor-default rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white"
            >
              Check out
            </button>
          </div>

          <div className="mt-8 border-t border-gray-200 pt-6">
            <RecommendationWidgetPreview
              {...widget}
              density="compact"
              sectionTitle="Pairs well with your cart"
            />
          </div>
        </div>
      </div>
    </MerchantPreviewChrome>
  );
}
