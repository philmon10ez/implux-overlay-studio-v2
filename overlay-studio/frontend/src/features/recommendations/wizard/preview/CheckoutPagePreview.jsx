import MerchantPreviewChrome from './MerchantPreviewChrome';
import RecommendationWidgetPreview from './RecommendationWidgetPreview';
import { MOCK_MERCHANT } from './mockMerchantContext';

const fmtMoney = (n) =>
  typeof n === 'number'
    ? n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '';

const STEPS = ['Cart', 'Information', 'Shipping', 'Payment'];

export default function CheckoutPagePreview({ widget }) {
  const { storeDomain, brandName, cart } = MOCK_MERCHANT;
  const path = `${storeDomain}/checkouts/cn/sample`;

  return (
    <MerchantPreviewChrome path={path} frameLabel="Checkout" brandName={brandName}>
      <div className="bg-gradient-to-b from-slate-50/90 to-white">
        <header className="border-b border-gray-200/80 bg-white/90 px-3 py-2.5 text-center sm:px-4">
          <span className="text-[11px] font-semibold text-gray-900">{brandName}</span>
        </header>

        <div className="px-3 py-4 sm:px-4">
          <div className="mb-4 flex flex-wrap justify-center gap-1">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`rounded-full px-2.5 py-0.5 text-[9px] font-semibold ${
                  i === 3 ? 'bg-accent/15 text-accent' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {s}
              </span>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-gray-900">Contact & shipping</h2>
              <div className="space-y-2 rounded-xl border border-dashed border-gray-200 bg-white/80 p-4">
                <div className="h-2.5 w-full rounded bg-gray-200/90" />
                <div className="h-2.5 w-[92%] rounded bg-gray-100" />
                <div className="h-2.5 w-[70%] rounded bg-gray-100" />
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-800">Shipping method</p>
                <div className="mt-3 space-y-2">
                  <label className="flex cursor-default items-center gap-2 rounded-lg border border-accent/30 bg-accent/[0.06] px-3 py-2">
                    <span className="h-3 w-3 rounded-full border-2 border-accent bg-accent" />
                    <span className="text-xs text-gray-800">Standard · FREE</span>
                  </label>
                  <label className="flex cursor-default items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                    <span className="h-3 w-3 rounded-full border-2 border-gray-300" />
                    <span className="text-xs text-gray-700">Express · $12</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-bold text-gray-900">Order summary</h3>
                <ul className="mt-3 space-y-2 border-b border-gray-100 pb-3">
                  {cart.lines.map((line) => (
                    <li key={line.sku} className="flex justify-between gap-2 text-[11px] text-gray-700">
                      <span className="min-w-0 truncate">
                        {line.title} × {line.qty}
                      </span>
                      <span className="shrink-0 font-medium">{fmtMoney(line.linePrice)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-between text-sm font-semibold text-gray-900">
                  <span>Total</span>
                  <span>{fmtMoney(cart.subtotal)}</span>
                </div>
              </div>

              <RecommendationWidgetPreview
                {...widget}
                density="compact"
                sectionTitle="Add before you complete"
              />

              <button
                type="button"
                className="w-full cursor-default rounded-xl bg-accent py-2.5 text-sm font-semibold text-white shadow-sm"
              >
                Pay now
              </button>
            </div>
          </div>
        </div>
      </div>
    </MerchantPreviewChrome>
  );
}
