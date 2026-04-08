export default function PromoStep({
  type,
  showPromoStep,
  setShowPromoStep,
  promoConfig,
  setPromoConfig,
}) {
  return (
    <div className="space-y-4 max-w-md">
      {(type === 'promo_banner' || type === 'sticky_footer' || type === 'spin_wheel') && (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          {type === 'spin_wheel'
            ? 'Set a primary promo code below as the default prize, or leave slice-specific codes in the Designer. Shoppers who land on a slice without a code will use this campaign code when provided.'
            : 'A clear, short code works best in the bar. Shoppers can copy it from the chip or your CTA.'}
        </p>
      )}
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={showPromoStep} onChange={(e) => setShowPromoStep(e.target.checked)} />
        Enable promo code for this campaign
      </label>
      {showPromoStep && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">Promo Code</label>
            <input
              value={promoConfig.code}
              onChange={(e) => setPromoConfig((p) => ({ ...p, code: e.target.value }))}
              placeholder="SAVE10"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={promoConfig.autoCopy}
              onChange={(e) => setPromoConfig((p) => ({ ...p, autoCopy: e.target.checked }))}
            />
            Auto-copy to clipboard on display
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={promoConfig.injectIntoCartUrl}
              onChange={(e) => setPromoConfig((p) => ({ ...p, injectIntoCartUrl: e.target.checked }))}
            />
            Inject promo into cart URL on CTA click
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700">Expiry (optional)</label>
            <input
              type="date"
              value={promoConfig.expiryDate}
              onChange={(e) => setPromoConfig((p) => ({ ...p, expiryDate: e.target.value }))}
              className="mt-1 rounded border border-gray-300 px-3 py-2"
            />
          </div>
        </>
      )}
    </div>
  );
}
