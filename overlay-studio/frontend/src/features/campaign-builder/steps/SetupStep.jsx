import { TYPES } from '../constants';

export default function SetupStep({
  name,
  setName,
  merchantId,
  setMerchantId,
  merchants,
  type,
  setType,
  setShowPromoStep,
  setTriggerConfig,
  setDesignConfig,
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Campaign Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Homepage Exit Intent"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Merchant</label>
        <select
          value={merchantId}
          onChange={(e) => setMerchantId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
        >
          <option value="">Select merchant</option>
          {merchants.map((m) => (
            <option key={m.id} value={m.id}>
              {m.storeName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Campaign Type</label>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setType(t.id);
                if (t.id === 'promo_banner') {
                  setShowPromoStep(true);
                  setTriggerConfig((tr) => ({
                    ...tr,
                    persistentBarDelayMs: tr.persistentBarDelayMs ?? 0,
                  }));
                  setDesignConfig((d) => ({
                    ...d,
                    barEdge: d.barEdge || 'top',
                    showPromoInBar: d.showPromoInBar !== false,
                    headline: d.headline || 'Limited time — save at checkout',
                    body: d.body || 'Apply your exclusive code before it expires.',
                    ctaText: d.ctaText || 'Copy code',
                    ctaAction: 'copy_promo',
                    position: 'top-bar',
                  }));
                } else if (t.id === 'sticky_footer') {
                  setShowPromoStep(true);
                  setTriggerConfig((tr) => ({
                    ...tr,
                    persistentBarDelayMs: tr.persistentBarDelayMs ?? 0,
                  }));
                  setDesignConfig((d) => ({
                    ...d,
                    barEdge: 'bottom',
                    showPromoInBar: d.showPromoInBar !== false,
                    headline: d.headline || 'Special offer — shop today',
                    body: d.body || 'Your discount code is ready at checkout.',
                    ctaText: d.ctaText || 'Copy code',
                    ctaAction: 'copy_promo',
                    position: 'bottom-bar',
                  }));
                } else if (t.id === 'spin_wheel') {
                  setShowPromoStep(true);
                  setDesignConfig((d) => ({
                    ...d,
                    spinTitle: d.spinTitle || d.headline || 'Spin to win!',
                    spinSubtitle:
                      d.spinSubtitle ||
                      d.subheadline ||
                      'Enter your email, then spin for a reward.',
                    spinButtonLabel: d.spinButtonLabel || d.ctaText || 'Spin the wheel',
                    headline: d.headline || 'Spin to win!',
                    ctaAction: d.ctaAction || 'copy_promo',
                  }));
                  setTriggerConfig((tr) => ({
                    ...tr,
                    spinWheelTrigger: tr.spinWheelTrigger || 'time_delay',
                    timeDelaySeconds: tr.timeDelaySeconds ?? 5,
                    scrollDepthPercent: tr.scrollDepthPercent ?? 50,
                  }));
                }
              }}
              className={`flex flex-col items-center rounded-lg border-2 p-4 text-center transition ${
                type === t.id ? 'border-accent bg-accent/10' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl">{t.icon}</span>
              <span className="mt-2 text-xs font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
