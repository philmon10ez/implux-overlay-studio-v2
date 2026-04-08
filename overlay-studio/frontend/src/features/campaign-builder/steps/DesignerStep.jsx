import { useState } from 'react';
import OverlayPreview from '../../../components/OverlayPreview';

const inputBase =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20';

function DesignPanel({ title, description, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-card sm:p-5">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description ? <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p> : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export default function DesignerStep({
  type,
  designConfig,
  setDesignConfig,
  mobilePreview,
  setMobilePreview,
  promoConfig,
  promoCode,
}) {
  const [fineTuneOpen, setFineTuneOpen] = useState(false);
  const [exitGateColorsOpen, setExitGateColorsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
      <div className="min-w-0 flex-1 space-y-5 lg:max-w-xl">
        <header className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-gray-900">Design your overlay</h2>
          <p className="mt-1 text-sm text-gray-600">
            Start with your message and buttons. Open <span className="font-medium text-gray-800">Fine-tune appearance</span>{' '}
            when you want fonts, colors, or animation.
          </p>
        </header>

        {type === 'exit_intent' && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900">Exit intent flow</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Shoppers first see a quick confirmation when they try to leave; if they stay, they see your main offer below.
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={designConfig.exitTwoStep !== false}
                onChange={(e) => setDesignConfig((d) => ({ ...d, exitTwoStep: e.target.checked }))}
              />
              <span>
                <span className="text-sm font-medium text-gray-800">Two-step: confirm exit, then show offer</span>
                <span className="mt-0.5 block text-xs text-gray-500">Turn off to skip the gate and show the offer immediately.</span>
              </span>
            </label>
            {designConfig.exitTwoStep !== false && (
              <>
                <div className="mt-4 space-y-3 border-t border-gray-200/80 pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Gate headline</label>
                    <input
                      value={designConfig.exitGateHeadline ?? ''}
                      onChange={(e) => setDesignConfig((d) => ({ ...d, exitGateHeadline: e.target.value }))}
                      className={`mt-1 ${inputBase}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Gate subheadline</label>
                    <input
                      value={designConfig.exitGateSubheadline ?? ''}
                      onChange={(e) => setDesignConfig((d) => ({ ...d, exitGateSubheadline: e.target.value }))}
                      className={`mt-1 ${inputBase}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Gate body</label>
                    <textarea
                      value={designConfig.exitGateBody ?? ''}
                      onChange={(e) => setDesignConfig((d) => ({ ...d, exitGateBody: e.target.value }))}
                      rows={3}
                      className={`mt-1 ${inputBase}`}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Stay button label</label>
                      <input
                        value={designConfig.exitStayCtaText ?? ''}
                        onChange={(e) => setDesignConfig((d) => ({ ...d, exitStayCtaText: e.target.value }))}
                        className={`mt-1 ${inputBase}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Leave button label</label>
                      <input
                        value={designConfig.exitLeaveCtaText ?? ''}
                        onChange={(e) => setDesignConfig((d) => ({ ...d, exitLeaveCtaText: e.target.value }))}
                        className={`mt-1 ${inputBase}`}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-3 border-t border-gray-200/80 pt-3">
                  <button
                    type="button"
                    onClick={() => setExitGateColorsOpen((o) => !o)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-2 text-left text-sm font-medium text-gray-800 hover:bg-white/60"
                    aria-expanded={exitGateColorsOpen}
                  >
                    <span>Customize gate button colors</span>
                    <span className="text-gray-400">{exitGateColorsOpen ? '▼' : '▶'}</span>
                  </button>
                  {exitGateColorsOpen ? (
                    <div className="mt-2 flex flex-wrap items-end gap-4">
                      <div>
                        <label className="block text-xs text-gray-600">Stay button fill</label>
                        <input
                          type="color"
                          value={designConfig.exitGateStayBgColor || designConfig.ctaBgColor}
                          onChange={(e) => setDesignConfig((d) => ({ ...d, exitGateStayBgColor: e.target.value }))}
                          className="mt-1 h-9 w-14 cursor-pointer rounded border border-gray-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">Stay label color</label>
                        <input
                          type="color"
                          value={designConfig.exitGateStayTextColor || designConfig.ctaTextColor}
                          onChange={(e) => setDesignConfig((d) => ({ ...d, exitGateStayTextColor: e.target.value }))}
                          className="mt-1 h-9 w-14 cursor-pointer rounded border border-gray-200"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">Leave label color</label>
                        <input
                          type="color"
                          value={designConfig.exitGateLeaveColor ?? '#6b7280'}
                          onChange={(e) => setDesignConfig((d) => ({ ...d, exitGateLeaveColor: e.target.value }))}
                          className="mt-1 h-9 w-14 cursor-pointer rounded border border-gray-200"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            )}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-700">Offer (after they stay)</h4>
              <p className="mt-1 text-xs text-gray-500">
                This is your discount or main pitch — set headline, image, and primary CTA in the sections below.
              </p>
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600">Eyebrow / label (optional)</label>
                <input
                  value={designConfig.exitOfferEyebrow ?? ''}
                  onChange={(e) => setDesignConfig((d) => ({ ...d, exitOfferEyebrow: e.target.value }))}
                  placeholder="e.g. 15% off today only"
                  className={`mt-1 ${inputBase}`}
                />
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs text-gray-500">Eyebrow color</label>
                  <input
                    type="color"
                    value={designConfig.exitOfferEyebrowColor ?? '#6c63ff'}
                    onChange={(e) => setDesignConfig((d) => ({ ...d, exitOfferEyebrowColor: e.target.value }))}
                    className="h-8 w-12 cursor-pointer rounded border border-gray-200"
                    title="Eyebrow color"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        {type === 'scroll_depth' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900">Scroll depth message</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Shoppers only see this after they scroll past your threshold — match headline and body to that moment (offer,
              recommendation, or signup).
            </p>
          </div>
        )}
        {type === 'welcome_mat' && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900">Full-screen welcome mat</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Content is centered on a full-screen layer. Use a bold headline, short body, and a clear primary CTA; set{' '}
              <strong>Secondary CTA</strong> to something like &quot;Continue to site&quot; so visitors can dismiss easily.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600">Content max width (px)</label>
              <p className="mt-0.5 text-xs text-gray-500">Keeps text readable on wide screens; the mat still fills the viewport.</p>
              <input
                type="number"
                min={280}
                max={1200}
                step={20}
                value={designConfig.welcomeMatInnerMaxPx ?? 640}
                onChange={(e) =>
                  setDesignConfig((d) => ({
                    ...d,
                    welcomeMatInnerMaxPx: Math.min(1200, Math.max(280, Number(e.target.value) || 640)),
                  }))
                }
                className={`mt-1 max-w-xs ${inputBase}`}
              />
            </div>
          </div>
        )}
        {type === 'upsell_modal' && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900">Upsell / cross-sell</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Lead with a clear benefit. Primary CTA can open a collection or product (<strong>Redirect URL</strong>); the
              secondary button keeps the flow optional. Use the Promo step when you want a code copied automatically.
            </p>
          </div>
        )}
        {type === 'promo_banner' && (
          <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Promo code banner</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Keep copy short. <strong>Copy promo code</strong> is often the best primary action so shoppers can paste at checkout.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600">Bar placement</label>
              <select
                value={designConfig.barEdge || 'top'}
                onChange={(e) => setDesignConfig((d) => ({ ...d, barEdge: e.target.value }))}
                className={`mt-1 ${inputBase}`}
              >
                <option value="top">Top of page</option>
                <option value="bottom">Bottom of page</option>
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={designConfig.showPromoInBar !== false}
                onChange={(e) => setDesignConfig((d) => ({ ...d, showPromoInBar: e.target.checked }))}
              />
              <span className="text-sm text-gray-800">Show promo code chip in the bar</span>
            </label>
          </div>
        )}
        {type === 'sticky_footer' && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Sticky footer bar</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Fixed to the <strong>bottom</strong> of the screen while visitors scroll — ideal for a persistent offer or code.
            </p>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={designConfig.showPromoInBar !== false}
                onChange={(e) => setDesignConfig((d) => ({ ...d, showPromoInBar: e.target.checked }))}
              />
              <span className="text-sm text-gray-800">Show promo code chip in the bar</span>
            </label>
          </div>
        )}
        {type === 'spin_wheel' && (
          <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Spin-to-win wheel</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Shoppers see this after your trigger fires. Each slice can override the promo code; leave code empty to use the
              campaign code from the Promo step.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600">Title</label>
              <input
                value={designConfig.spinTitle ?? ''}
                onChange={(e) => setDesignConfig((d) => ({ ...d, spinTitle: e.target.value }))}
                className={`mt-1 ${inputBase}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Subtitle</label>
              <input
                value={designConfig.spinSubtitle ?? ''}
                onChange={(e) => setDesignConfig((d) => ({ ...d, spinSubtitle: e.target.value }))}
                className={`mt-1 ${inputBase}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Spin button label</label>
              <input
                value={designConfig.spinButtonLabel ?? ''}
                onChange={(e) => setDesignConfig((d) => ({ ...d, spinButtonLabel: e.target.value }))}
                className={`mt-1 ${inputBase}`}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={!!designConfig.spinRequireEmail}
                onChange={(e) => setDesignConfig((d) => ({ ...d, spinRequireEmail: e.target.checked }))}
              />
              <span className="text-sm text-gray-800">Require email before spinning</span>
            </label>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Wheel slices</span>
                <button
                  type="button"
                  onClick={() =>
                    setDesignConfig((d) => ({
                      ...d,
                      spinSegments: [...(d.spinSegments || []), { label: 'New prize', weight: 1, code: '' }],
                    }))
                  }
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Add slice
                </button>
              </div>
              <ul className="mt-2 space-y-2">
                {(designConfig.spinSegments || []).map((seg, idx) => (
                  <li key={idx} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-2.5">
                    <div className="min-w-[120px] flex-1">
                      <label className="text-[10px] font-medium uppercase text-gray-500">Label</label>
                      <input
                        value={seg.label || ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDesignConfig((d) => {
                            const segs = [...(d.spinSegments || [])];
                            segs[idx] = { ...segs[idx], label: v };
                            return { ...d, spinSegments: segs };
                          });
                        }}
                        className={`mt-0.5 ${inputBase}`}
                      />
                    </div>
                    <div className="w-20">
                      <label className="text-[10px] font-medium uppercase text-gray-500">Weight</label>
                      <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={seg.weight ?? 1}
                        onChange={(e) => {
                          const w = Number(e.target.value) || 1;
                          setDesignConfig((d) => {
                            const segs = [...(d.spinSegments || [])];
                            segs[idx] = { ...segs[idx], weight: w };
                            return { ...d, spinSegments: segs };
                          });
                        }}
                        className={`mt-0.5 ${inputBase}`}
                      />
                    </div>
                    <div className="min-w-[100px] flex-1">
                      <label className="text-[10px] font-medium uppercase text-gray-500">Code (optional)</label>
                      <input
                        value={seg.code || ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDesignConfig((d) => {
                            const segs = [...(d.spinSegments || [])];
                            segs[idx] = { ...segs[idx], code: v };
                            return { ...d, spinSegments: segs };
                          });
                        }}
                        placeholder="Uses campaign code if empty"
                        className={`mt-0.5 font-mono ${inputBase}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDesignConfig((d) => ({
                          ...d,
                          spinSegments: (d.spinSegments || []).filter((_, i) => i !== idx),
                        }))
                      }
                      disabled={(designConfig.spinSegments || []).length <= 2}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <DesignPanel
          title="Backdrop & placement"
          description={
            !['promo_banner', 'sticky_footer'].includes(type)
              ? 'Size and position control how the overlay sits on the page.'
              : 'Background tints the bar; placement is fixed for this format.'
          }
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Overlay background</label>
            <p className="mt-0.5 text-xs text-gray-500">Color plus opacity behind your content.</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={designConfig.background}
                onChange={(e) => setDesignConfig((d) => ({ ...d, background: e.target.value }))}
                className="h-10 w-14 cursor-pointer rounded border border-gray-200"
              />
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={designConfig.backgroundOpacity}
                  onChange={(e) => setDesignConfig((d) => ({ ...d, backgroundOpacity: Number(e.target.value) }))}
                  className="min-w-0 flex-1"
                />
                <span className="w-10 shrink-0 text-sm tabular-nums text-gray-600">
                  {Math.round(designConfig.backgroundOpacity * 100)}%
                </span>
              </div>
            </div>
          </div>
          {!['promo_banner', 'sticky_footer'].includes(type) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Size</label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {['small', 'medium', 'large', 'full'].map((s) => (
                    <label key={s} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="size"
                        checked={designConfig.size === s}
                        onChange={() => setDesignConfig((d) => ({ ...d, size: s }))}
                      />
                      <span className="text-sm capitalize text-gray-800">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Position</label>
                <select
                  value={designConfig.position}
                  onChange={(e) => setDesignConfig((d) => ({ ...d, position: e.target.value }))}
                  className={`mt-2 ${inputBase}`}
                >
                  <option value="center">Center</option>
                  <option value="bottom-bar">Bottom bar</option>
                  <option value="top-bar">Top bar</option>
                  <option value="bottom-right">Bottom right</option>
                  <option value="bottom-left">Bottom left</option>
                </select>
              </div>
            </>
          )}
        </DesignPanel>

        <DesignPanel title="Message" description="Main text shoppers read first. You can tweak fonts and colors under Fine-tune.">
          <div>
            <label className="block text-sm font-medium text-gray-700">Headline</label>
            <input
              value={designConfig.headline}
              onChange={(e) => setDesignConfig((d) => ({ ...d, headline: e.target.value }))}
              className={`mt-2 ${inputBase}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Subheadline</label>
            <input
              value={designConfig.subheadline}
              onChange={(e) => setDesignConfig((d) => ({ ...d, subheadline: e.target.value }))}
              className={`mt-2 ${inputBase}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Body</label>
            <textarea
              value={designConfig.body}
              onChange={(e) => setDesignConfig((d) => ({ ...d, body: e.target.value }))}
              rows={3}
              className={`mt-2 ${inputBase}`}
            />
          </div>
        </DesignPanel>

        <DesignPanel
          title="Buttons"
          description="Primary action is the main tap target; secondary is usually dismiss or “no thanks.”"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Primary button label</label>
            <input
              value={designConfig.ctaText}
              onChange={(e) => setDesignConfig((d) => ({ ...d, ctaText: e.target.value }))}
              placeholder="e.g. Get the code"
              className={`mt-2 ${inputBase}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Primary button action</label>
            <select
              value={designConfig.ctaAction}
              onChange={(e) => setDesignConfig((d) => ({ ...d, ctaAction: e.target.value }))}
              className={`mt-2 ${inputBase}`}
            >
              <option value="redirect">Open a URL</option>
              <option value="copy_promo">Copy promo code</option>
              <option value="close">Close overlay</option>
            </select>
          </div>
          {designConfig.ctaAction === 'redirect' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Destination URL</label>
              <input
                value={designConfig.ctaUrl}
                onChange={(e) => setDesignConfig((d) => ({ ...d, ctaUrl: e.target.value }))}
                placeholder="https://…"
                className={`mt-2 ${inputBase}`}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Secondary button (dismiss)</label>
            <p className="mt-0.5 text-xs text-gray-500">Optional. Leave blank to hide.</p>
            <input
              value={designConfig.secondaryCtaText}
              onChange={(e) => setDesignConfig((d) => ({ ...d, secondaryCtaText: e.target.value }))}
              placeholder="e.g. No thanks"
              className={`mt-2 ${inputBase}`}
            />
          </div>
        </DesignPanel>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50 shadow-card">
          <button
            type="button"
            onClick={() => setFineTuneOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-100/80 sm:px-5"
            aria-expanded={fineTuneOpen}
          >
            <div>
              <span className="text-sm font-semibold text-gray-900">Fine-tune appearance</span>
              <p className="mt-0.5 text-xs text-gray-500">Typography, button colors, image, animation, close behavior</p>
            </div>
            <span className="shrink-0 text-gray-400">{fineTuneOpen ? '▼' : '▶'}</span>
          </button>
          {fineTuneOpen ? (
            <div className="space-y-5 border-t border-gray-200 bg-white px-4 py-5 sm:px-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Headline</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1 text-sm text-gray-700">
                    Size
                    <input
                      type="number"
                      min={12}
                      max={48}
                      value={designConfig.headlineSize}
                      onChange={(e) => setDesignConfig((d) => ({ ...d, headlineSize: Number(e.target.value) }))}
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={designConfig.headlineBold}
                      onChange={(e) => setDesignConfig((d) => ({ ...d, headlineBold: e.target.checked }))}
                    />
                    Bold
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    Color
                    <input
                      type="color"
                      value={designConfig.headlineColor}
                      onChange={(e) => setDesignConfig((d) => ({ ...d, headlineColor: e.target.value }))}
                      className="h-8 w-10 cursor-pointer rounded border border-gray-200"
                    />
                  </label>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subheadline</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1 text-sm text-gray-700">
                    Size
                    <input
                      type="number"
                      min={12}
                      max={24}
                      value={designConfig.subheadlineSize}
                      onChange={(e) => setDesignConfig((d) => ({ ...d, subheadlineSize: Number(e.target.value) }))}
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    Color
                    <input
                      type="color"
                      value={designConfig.subheadlineColor}
                      onChange={(e) => setDesignConfig((d) => ({ ...d, subheadlineColor: e.target.value }))}
                      className="h-8 w-10 cursor-pointer rounded border border-gray-200"
                    />
                  </label>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Body</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1 text-sm text-gray-700">
                    Size
                    <input
                      type="number"
                      min={12}
                      max={20}
                      value={designConfig.bodySize}
                      onChange={(e) => setDesignConfig((d) => ({ ...d, bodySize: Number(e.target.value) }))}
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    Color
                    <input
                      type="color"
                      value={designConfig.bodyColor}
                      onChange={(e) => setDesignConfig((d) => ({ ...d, bodyColor: e.target.value }))}
                      className="h-8 w-10 cursor-pointer rounded border border-gray-200"
                    />
                  </label>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Primary button styling</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    Fill
                    <input
                      type="color"
                      value={designConfig.ctaBgColor}
                      onChange={(e) => setDesignConfig((d) => ({ ...d, ctaBgColor: e.target.value }))}
                      className="h-8 w-10 cursor-pointer rounded border border-gray-200"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    Text
                    <input
                      type="color"
                      value={designConfig.ctaTextColor}
                      onChange={(e) => setDesignConfig((d) => ({ ...d, ctaTextColor: e.target.value }))}
                      className="h-8 w-10 cursor-pointer rounded border border-gray-200"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    Corner radius
                    <input
                      type="range"
                      min={0}
                      max={24}
                      value={designConfig.ctaBorderRadius}
                      onChange={(e) => setDesignConfig((d) => ({ ...d, ctaBorderRadius: Number(e.target.value) }))}
                      className="w-24"
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Image</label>
                <p className="mt-0.5 text-xs text-gray-500">Optional hero or logo beside your copy.</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => setDesignConfig((d) => ({ ...d, imageDataUrl: r.result }));
                    r.readAsDataURL(f);
                  }}
                  className="mt-2 text-sm text-gray-700 file:mr-2 file:rounded-lg file:border-0 file:bg-accent/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent hover:file:bg-accent/15"
                />
              </div>
              <div>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={designConfig.showCloseButton}
                    onChange={(e) => setDesignConfig((d) => ({ ...d, showCloseButton: e.target.checked }))}
                  />
                  <span>
                    <span className="text-sm font-medium text-gray-800">Show close (X) control</span>
                    <span className="mt-0.5 block text-xs text-gray-500">Lets visitors dismiss without using a button.</span>
                  </span>
                </label>
                {designConfig.showCloseButton && (
                  <div className="mt-2 pl-7">
                    <label className="text-xs text-gray-600">Delay before close appears (seconds)</label>
                    <input
                      type="number"
                      min={0}
                      value={designConfig.closeDelay}
                      onChange={(e) => setDesignConfig((d) => ({ ...d, closeDelay: Number(e.target.value) }))}
                      placeholder="0"
                      className="mt-1 w-28 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Entrance animation</label>
                <select
                  value={designConfig.animation}
                  onChange={(e) => setDesignConfig((d) => ({ ...d, animation: e.target.value }))}
                  className={`mt-2 ${inputBase}`}
                >
                  <option value="fade">Fade in</option>
                  <option value="slide-up">Slide up</option>
                  <option value="slide-down">Slide down</option>
                  <option value="bounce">Bounce</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="w-full shrink-0 lg:w-[min(100%,520px)] lg:flex-[1.15]">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setMobilePreview((m) => !m)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            {mobilePreview ? 'Desktop preview' : 'Mobile preview'}
          </button>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-gradient-to-b from-gray-50/80 to-white p-3 shadow-card sm:p-4">
          <OverlayPreview
            designConfig={designConfig}
            mobile={mobilePreview}
            campaignType={type}
            previewPromoCode={promoConfig.code || promoCode || ''}
          />
        </div>
      </div>
    </div>
  );
}
