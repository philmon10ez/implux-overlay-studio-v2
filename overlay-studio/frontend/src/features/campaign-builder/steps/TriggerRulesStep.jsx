import FrequencyCapFields from '../../../components/FrequencyCapFields';

export default function TriggerRulesStep({ type, triggerConfig, setTriggerConfig, frequencyCap, setFrequencyCap }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        {type === 'exit_intent' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Sensitivity</label>
            <select
              value={triggerConfig.sensitivity}
              onChange={(e) => setTriggerConfig((t) => ({ ...t, sensitivity: e.target.value }))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            >
              <option value="low">Low (cursor must reach top edge)</option>
              <option value="medium">Medium</option>
              <option value="high">High (triggers sooner near top)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Uses mouse movement toward the top of the page (desktop). Mobile browsers do not support true exit
              intent; use other campaign types for mobile-only flows if needed.
            </p>
          </div>
        )}
        {type === 'time_delay' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Delay (seconds)</label>
            <input
              type="number"
              min={1}
              value={triggerConfig.timeDelaySeconds}
              onChange={(e) => setTriggerConfig((t) => ({ ...t, timeDelaySeconds: Number(e.target.value) || 0 }))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
        )}
        {type === 'scroll_depth' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Scroll depth trigger</h3>
              <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                The popup runs after a visitor has scrolled down a set portion of the page — a signal they are engaged.
                Higher percentages (e.g. 65–80%) target readers who consume more content; lower values (e.g. 35–50%)
                cast a wider net. Pair with a timely offer, related products, or a lead capture in the Designer step.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Depth threshold</label>
              <p className="mt-0.5 text-xs text-gray-500">Percent of total scroll distance (top to bottom).</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[40, 50, 65, 75, 90].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTriggerConfig((t) => ({ ...t, scrollDepthPercent: p }))}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      triggerConfig.scrollDepthPercent === p
                        ? 'border-accent bg-accent text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={Math.min(100, Math.max(1, Number(triggerConfig.scrollDepthPercent) || 50))}
                onChange={(e) => setTriggerConfig((t) => ({ ...t, scrollDepthPercent: Number(e.target.value) }))}
                className="mt-3 w-full"
              />
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-sm text-gray-600">{triggerConfig.scrollDepthPercent ?? 50}%</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={triggerConfig.scrollDepthPercent ?? 50}
                  onChange={(e) =>
                    setTriggerConfig((t) => ({
                      ...t,
                      scrollDepthPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    }))
                  }
                  className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-right"
                  aria-label="Scroll depth percent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Short pages (little or no scroll)</label>
              <p className="mt-0.5 text-xs text-gray-500">
                Some landing pages barely scroll. Choose whether to show the popup anyway or only when real scroll
                depth exists.
              </p>
              <select
                value={triggerConfig.scrollShortPageBehavior || 'immediate'}
                onChange={(e) => setTriggerConfig((t) => ({ ...t, scrollShortPageBehavior: e.target.value }))}
                className="mt-2 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="immediate">Show popup (treat as fully scrolled)</option>
                <option value="never">Do not show on non-scrollable pages</option>
              </select>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={triggerConfig.scrollEvaluateOnLoad !== false}
                onChange={(e) => setTriggerConfig((t) => ({ ...t, scrollEvaluateOnLoad: e.target.checked }))}
              />
              <span className="text-sm text-gray-800">
                Trigger if visitor is already past the threshold when the page loads
              </span>
            </label>
          </div>
        )}
        {type === 'welcome_mat' && (
          <div className="rounded-lg border border-violet-200 bg-violet-50/70 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Welcome mat timing</h3>
              <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                The welcome mat covers the full screen as soon as the visitor lands (after any delay below). Use it
                for strong promotions, announcements, or email capture — pair with a clear primary action and an easy
                &quot;continue browsing&quot; link in the Designer (secondary CTA).
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Delay before show (ms)</label>
              <p className="mt-0.5 text-xs text-gray-500">0 = immediate. Small delays (200–800ms) can feel smoother after paint.</p>
              <input
                type="number"
                min={0}
                max={60000}
                step={100}
                value={triggerConfig.welcomeMatDelayMs ?? 0}
                onChange={(e) =>
                  setTriggerConfig((t) => ({
                    ...t,
                    welcomeMatDelayMs: Math.min(60000, Math.max(0, Number(e.target.value) || 0)),
                  }))
                }
                className="mt-1 w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={triggerConfig.welcomeMatBackdropDismiss !== false}
                onChange={(e) => setTriggerConfig((t) => ({ ...t, welcomeMatBackdropDismiss: e.target.checked }))}
              />
              <span className="text-sm text-gray-800">Allow closing by clicking the dimmed area behind the mat</span>
            </label>
          </div>
        )}
        {type === 'upsell_modal' && (
          <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Upsell / cross-sell timing</h3>
              <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                This modal runs after Shopify confirms an <strong>add to cart</strong> (Ajax{' '}
                <code className="rounded bg-white/80 px-1">/cart/add</code>
                ). Use it to suggest add-ons, bundles, or upgrades while purchase intent is high. Use{' '}
                <strong>Page targeting</strong> below to limit by path (e.g. product pages or a <strong>custom URL</strong>{' '}
                regex for a vendor product). Use <strong>Variant SKUs</strong> to tie this campaign to specific products
                (matches each variant&apos;s SKU in Shopify). <strong>Frequency cap</strong> avoids nagging (e.g. once per
                session).
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Delay after add to cart (ms)</label>
              <p className="mt-0.5 text-xs text-gray-500">
                Short delay lets the theme update the cart drawer or button state before your modal appears.
              </p>
              <input
                type="number"
                min={0}
                max={15000}
                step={100}
                value={triggerConfig.upsellAfterAddDelayMs ?? 500}
                onChange={(e) =>
                  setTriggerConfig((t) => ({
                    ...t,
                    upsellAfterAddDelayMs: Math.min(15000, Math.max(0, Number(e.target.value) || 0)),
                  }))
                }
                className="mt-1 w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Variant SKUs (optional)</label>
              <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                If you list SKUs, this modal only appears when the item just added uses a matching variant SKU
                (case-insensitive). Leave blank to fire for any add-to-cart that passes page and device rules. Combine
                with <strong>Custom URL</strong> or <strong>Product pages</strong> to align with specific vendor product
                URLs.
              </p>
              <textarea
                value={triggerConfig.upsellSkuAllowlist ?? ''}
                onChange={(e) => setTriggerConfig((t) => ({ ...t, upsellSkuAllowlist: e.target.value }))}
                placeholder={'e.g. VENDOR-TEE-BLK-S\nVENDOR-MUG-01'}
                rows={4}
                className="mt-1 w-full max-w-lg rounded border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
        )}
        {(type === 'promo_banner' || type === 'sticky_footer') && (
          <div className="rounded-lg border border-teal-200 bg-teal-50/70 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Persistent bar</h3>
              <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                {type === 'promo_banner'
                  ? 'A slim bar at the top or bottom of the page stays visible as shoppers browse — ideal for sitewide codes, free shipping, or seasonal sales. It does not dim the page.'
                  : 'A fixed strip at the bottom of the viewport stays in view while scrolling — great for CTAs, codes, and reminders without blocking content.'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Delay before bar appears (ms)</label>
              <p className="mt-0.5 text-xs text-gray-500">0 = as soon as targeting rules pass. Small delays (200–800ms) can feel smoother after load.</p>
              <input
                type="number"
                min={0}
                max={60000}
                step={100}
                value={triggerConfig.persistentBarDelayMs ?? 0}
                onChange={(e) =>
                  setTriggerConfig((t) => ({
                    ...t,
                    persistentBarDelayMs: Math.min(60000, Math.max(0, Number(e.target.value) || 0)),
                  }))
                }
                className="mt-1 w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
        {type === 'spin_wheel' && (
          <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50/70 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Spin wheel — when to show</h3>
              <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                The wheel opens as a focused popup after the trigger you choose. Pair with the Designer (wheel copy) and
                Promo Code step for rewards shoppers can redeem at checkout.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Trigger</label>
              <select
                value={triggerConfig.spinWheelTrigger || 'time_delay'}
                onChange={(e) => setTriggerConfig((t) => ({ ...t, spinWheelTrigger: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="time_delay">Time on site</option>
                <option value="scroll_depth">Scroll depth</option>
                <option value="exit_intent">Exit intent (desktop)</option>
              </select>
            </div>
            {triggerConfig.spinWheelTrigger === 'exit_intent' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sensitivity</label>
                  <select
                    value={triggerConfig.sensitivity}
                    onChange={(e) => setTriggerConfig((t) => ({ ...t, sensitivity: e.target.value }))}
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Delay on mobile / touch (seconds)</label>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Exit intent only works with a mouse on desktop. Phones and tablets use this timer instead.
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={triggerConfig.timeDelaySeconds ?? 8}
                    onChange={(e) =>
                      setTriggerConfig((t) => ({
                        ...t,
                        timeDelaySeconds: Math.min(120, Math.max(1, Number(e.target.value) || 8)),
                      }))
                    }
                    className="mt-1 w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
            {triggerConfig.spinWheelTrigger === 'time_delay' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Delay (seconds)</label>
                <input
                  type="number"
                  min={1}
                  value={triggerConfig.timeDelaySeconds}
                  onChange={(e) =>
                    setTriggerConfig((t) => ({
                      ...t,
                      timeDelaySeconds: Number(e.target.value) || 0,
                    }))
                  }
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
            )}
            {triggerConfig.spinWheelTrigger === 'scroll_depth' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Scroll depth (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={triggerConfig.scrollDepthPercent ?? 50}
                  onChange={(e) =>
                    setTriggerConfig((t) => ({
                      ...t,
                      scrollDepthPercent: Math.min(100, Math.max(1, Number(e.target.value) || 50)),
                    }))
                  }
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700">Page Targeting</label>
          <div className="mt-2 space-y-2">
            {['all', 'homepage', 'product', 'cart', 'custom'].map((v) => (
              <label key={v} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pageTargeting"
                  checked={triggerConfig.pageTargeting === v}
                  onChange={() => setTriggerConfig((t) => ({ ...t, pageTargeting: v }))}
                />
                <span className="capitalize">
                  {v === 'all'
                    ? 'All Pages'
                    : v === 'product'
                      ? 'Product Pages'
                      : v === 'cart'
                        ? 'Cart Page'
                        : v === 'custom'
                          ? 'Custom URL'
                          : 'Homepage'}
                </span>
              </label>
            ))}
          </div>
          {triggerConfig.pageTargeting === 'custom' && (
            <input
              value={triggerConfig.customUrlRegex}
              onChange={(e) => setTriggerConfig((t) => ({ ...t, customUrlRegex: e.target.value }))}
              placeholder="Regex pattern"
              className="mt-2 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Device Targeting</label>
          <div className="mt-2 flex gap-4">
            {['Desktop', 'Mobile', 'Tablet'].map((d) => {
              const key = `device${d.charAt(0)}${d.slice(1).toLowerCase()}`;
              const k =
                key === 'deviceDesktop' ? 'deviceDesktop' : key === 'deviceMobile' ? 'deviceMobile' : 'deviceTablet';
              return (
                <label key={d} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={triggerConfig[k]}
                    onChange={(e) => setTriggerConfig((t) => ({ ...t, [k]: e.target.checked }))}
                  />
                  {d}
                </label>
              );
            })}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
          <p className="mb-3 text-sm font-medium text-gray-800">How often shoppers see this experience</p>
          <FrequencyCapFields idPrefix="campaign-fc" value={frequencyCap} onChange={setFrequencyCap} />
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={triggerConfig.cartValueFilter}
              onChange={(e) => setTriggerConfig((t) => ({ ...t, cartValueFilter: e.target.checked }))}
            />
            Show only if cart &gt; $X
          </label>
          {triggerConfig.cartValueFilter && (
            <input
              type="number"
              min={0}
              step={0.01}
              value={triggerConfig.cartValueMin}
              onChange={(e) => setTriggerConfig((t) => ({ ...t, cartValueMin: Number(e.target.value) || 0 }))}
              className="mt-2 w-32 rounded border border-gray-300 px-3 py-2"
            />
          )}
        </div>
      </div>
    </div>
  );
}
