import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import OverlayPreview from '../components/OverlayPreview';

const STEPS = ['Setup', 'Trigger Rules', 'Designer', 'Promo Code', 'Review'];
const TYPES = [
  { id: 'exit_intent', label: 'Exit Intent Popup', icon: '🚪' },
  { id: 'time_delay', label: 'Time Delay Popup', icon: '⏱' },
  { id: 'scroll_depth', label: 'Scroll Depth Popup', icon: '📜' },
  { id: 'welcome_mat', label: 'Welcome Mat (full-screen)', icon: '🛋' },
  { id: 'upsell_modal', label: 'Upsell / Cross-sell Modal', icon: '🛒' },
  { id: 'promo_banner', label: 'Promo Code Banner', icon: '🏷' },
  { id: 'spin_wheel', label: 'Spin-to-Win Wheel', icon: '🎡' },
  { id: 'sticky_footer', label: 'Sticky Footer Bar', icon: '📌' },
];

const defaultTrigger = {
  sensitivity: 'medium',
  timeDelaySeconds: 5,
  scrollDepthPercent: 50,
  pageTargeting: 'all',
  customUrlRegex: '',
  deviceDesktop: true,
  deviceMobile: true,
  deviceTablet: true,
  frequencyCap: 'once_per_session',
  cartValueFilter: false,
  cartValueMin: 0,
};

const defaultDesign = {
  background: '#ffffff',
  backgroundOpacity: 0.95,
  size: 'medium',
  position: 'center',
  headline: 'Welcome!',
  headlineSize: 24,
  headlineBold: true,
  headlineColor: '#1f2937',
  subheadline: '',
  subheadlineSize: 16,
  subheadlineColor: '#6b7280',
  body: 'Get 10% off your first order.',
  bodySize: 14,
  bodyColor: '#4b5563',
  ctaText: 'Get Offer',
  ctaAction: 'copy_promo',
  ctaUrl: '',
  ctaBgColor: '#6c63ff',
  ctaTextColor: '#ffffff',
  ctaBorderRadius: 8,
  secondaryCtaText: 'No thanks',
  imageDataUrl: '',
  showCloseButton: true,
  closeDelay: 0,
  animation: 'fade',
};

const defaultPromo = {
  code: '',
  autoCopy: false,
  injectIntoCartUrl: false,
  expiryDate: '',
};

export default function CampaignBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [step, setStep] = useState(1);
  const [merchants, setMerchants] = useState([]);
  const [name, setName] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [type, setType] = useState('');
  const [triggerConfig, setTriggerConfig] = useState(defaultTrigger);
  const [designConfig, setDesignConfig] = useState(defaultDesign);
  const [promoCode, setPromoCode] = useState('');
  const [promoConfig, setPromoConfig] = useState(defaultPromo);
  const [showPromoStep, setShowPromoStep] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    api.merchants.list().then((r) => setMerchants(r.merchants || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.campaigns
      .get(id)
      .then((r) => {
        const c = r.campaign;
        setName(c.name);
        setMerchantId(String(c.merchantId));
        setType(c.type || '');
        setTriggerConfig({ ...defaultTrigger, ...(c.triggerConfig || {}) });
        setDesignConfig({ ...defaultDesign, ...(c.designConfig || {}) });
        setPromoCode(c.promoCode || '');
        setPromoConfig({ ...defaultPromo, ...(c.promoConfig || {}) });
        setShowPromoStep(!!c.promoCode || type === 'promo_banner');
      })
      .catch(() => navigate('/campaigns'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);


  const next = () => {
    if (step < 5) setStep(step + 1);
  };
  const prev = () => {
    if (step > 1) setStep(step - 1);
  };

  const saveDraft = () => {
    setSaving(true);
    const payload = {
      name: name || 'Untitled Campaign',
      merchantId: parseInt(merchantId, 10),
      type: type || 'exit_intent',
      triggerConfig,
      designConfig,
      promoCode: promoConfig.code || promoCode || null,
      status: 'draft',
    };
    if (isEdit) {
      api.campaigns
        .update(id, payload)
        .then(() => navigate('/campaigns'))
        .catch((e) => alert(e.body?.error || e.message))
        .finally(() => setSaving(false));
    } else {
      api.campaigns
        .create(payload)
        .then((r) => navigate(`/campaigns/${r.campaign.id}/edit`))
        .catch((e) => alert(e.body?.error || e.message))
        .finally(() => setSaving(false));
    }
  };

  const publish = () => {
    setSaving(true);
    const payload = {
      name: name || 'Untitled Campaign',
      merchantId: parseInt(merchantId, 10),
      type: type || 'exit_intent',
      triggerConfig,
      designConfig,
      promoCode: promoConfig.code || promoCode || null,
    };
    const run = () => {
      if (isEdit && id) {
        return api.campaigns.update(id, payload).then(() => api.campaigns.publish(id));
      }
      return api.campaigns.create({ ...payload, status: 'draft' }).then((r) => api.campaigns.publish(r.campaign.id));
    };
    run()
      .then(() => navigate('/campaigns'))
      .catch((e) => alert(e.body?.error || e.message))
      .finally(() => setSaving(false));
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Campaign' : 'New Campaign'}</h1>

      {/* Progress bar */}
      <div className="mt-6 flex gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i + 1)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              step >= i + 1 ? 'bg-accent text-white' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-lg bg-white p-6 shadow-card">
        {/* Step 1 — Setup */}
        {step === 1 && (
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
                  <option key={m.id} value={m.id}>{m.storeName}</option>
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
                    onClick={() => setType(t.id)}
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
        )}

        {/* Step 2 — Trigger Rules */}
        {step === 2 && (
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
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">Scroll depth %</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={triggerConfig.scrollDepthPercent}
                    onChange={(e) => setTriggerConfig((t) => ({ ...t, scrollDepthPercent: Number(e.target.value) }))}
                    className="mt-1 w-full"
                  />
                  <span className="text-sm text-gray-500">{triggerConfig.scrollDepthPercent}%</span>
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
                      <span className="capitalize">{v === 'all' ? 'All Pages' : v === 'product' ? 'Product Pages' : v === 'cart' ? 'Cart Page' : v === 'custom' ? 'Custom URL' : 'Homepage'}</span>
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
                    const k = key === 'deviceDesktop' ? 'deviceDesktop' : key === 'deviceMobile' ? 'deviceMobile' : 'deviceTablet';
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
              <div>
                <label className="block text-sm font-medium text-gray-700">Frequency Cap</label>
                <select
                  value={triggerConfig.frequencyCap}
                  onChange={(e) => setTriggerConfig((t) => ({ ...t, frequencyCap: e.target.value }))}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="once_per_session">Once per session</option>
                  <option value="once_per_day">Once per day</option>
                  <option value="once_ever">Once ever</option>
                  <option value="always">Always</option>
                </select>
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
        )}

        {/* Step 3 — Designer */}
        {step === 3 && (
          <div className="flex gap-6">
            <div className="w-[40%] space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Background</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="color"
                    value={designConfig.background}
                    onChange={(e) => setDesignConfig((d) => ({ ...d, background: e.target.value }))}
                    className="h-10 w-14 cursor-pointer rounded border"
                  />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={designConfig.backgroundOpacity}
                    onChange={(e) => setDesignConfig((d) => ({ ...d, backgroundOpacity: Number(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-sm">{Math.round(designConfig.backgroundOpacity * 100)}%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Size</label>
                <div className="mt-1 flex gap-2">
                  {['small', 'medium', 'large', 'full'].map((s) => (
                    <label key={s} className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="size"
                        checked={designConfig.size === s}
                        onChange={() => setDesignConfig((d) => ({ ...d, size: s }))}
                      />
                      <span className="capitalize">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Position</label>
                <select
                  value={designConfig.position}
                  onChange={(e) => setDesignConfig((d) => ({ ...d, position: e.target.value }))}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="center">Center</option>
                  <option value="bottom-bar">Bottom Bar</option>
                  <option value="top-bar">Top Bar</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Headline</label>
                <input
                  value={designConfig.headline}
                  onChange={(e) => setDesignConfig((d) => ({ ...d, headline: e.target.value }))}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={12}
                    max={48}
                    value={designConfig.headlineSize}
                    onChange={(e) => setDesignConfig((d) => ({ ...d, headlineSize: Number(e.target.value) }))}
                    className="w-16 rounded border px-2 py-1 text-sm"
                  />
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={designConfig.headlineBold}
                      onChange={(e) => setDesignConfig((d) => ({ ...d, headlineBold: e.target.checked }))}
                    />
                    Bold
                  </label>
                  <input
                    type="color"
                    value={designConfig.headlineColor}
                    onChange={(e) => setDesignConfig((d) => ({ ...d, headlineColor: e.target.value }))}
                    className="h-8 w-10 cursor-pointer rounded border"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subheadline</label>
                <input
                  value={designConfig.subheadline}
                  onChange={(e) => setDesignConfig((d) => ({ ...d, subheadline: e.target.value }))}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    min={12}
                    max={24}
                    value={designConfig.subheadlineSize}
                    onChange={(e) => setDesignConfig((d) => ({ ...d, subheadlineSize: Number(e.target.value) }))}
                    className="w-16 rounded border px-2 py-1 text-sm"
                  />
                  <input
                    type="color"
                    value={designConfig.subheadlineColor}
                    onChange={(e) => setDesignConfig((d) => ({ ...d, subheadlineColor: e.target.value }))}
                    className="h-8 w-10 cursor-pointer rounded border"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Body</label>
                <textarea
                  value={designConfig.body}
                  onChange={(e) => setDesignConfig((d) => ({ ...d, body: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    min={12}
                    max={20}
                    value={designConfig.bodySize}
                    onChange={(e) => setDesignConfig((d) => ({ ...d, bodySize: Number(e.target.value) }))}
                    className="w-16 rounded border px-2 py-1 text-sm"
                  />
                  <input
                    type="color"
                    value={designConfig.bodyColor}
                    onChange={(e) => setDesignConfig((d) => ({ ...d, bodyColor: e.target.value }))}
                    className="h-8 w-10 cursor-pointer rounded border"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">CTA Button</label>
                <input
                  value={designConfig.ctaText}
                  onChange={(e) => setDesignConfig((d) => ({ ...d, ctaText: e.target.value }))}
                  placeholder="Button text"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
                <select
                  value={designConfig.ctaAction}
                  onChange={(e) => setDesignConfig((d) => ({ ...d, ctaAction: e.target.value }))}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="redirect">Redirect URL</option>
                  <option value="copy_promo">Copy Promo Code</option>
                  <option value="close">Just Close</option>
                </select>
                {designConfig.ctaAction === 'redirect' && (
                  <input
                    value={designConfig.ctaUrl}
                    onChange={(e) => setDesignConfig((d) => ({ ...d, ctaUrl: e.target.value }))}
                    placeholder="https://..."
                    className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                )}
                <div className="mt-2 flex gap-2">
                  <input
                    type="color"
                    value={designConfig.ctaBgColor}
                    onChange={(e) => setDesignConfig((d) => ({ ...d, ctaBgColor: e.target.value }))}
                    className="h-8 w-10 cursor-pointer rounded border"
                  />
                  <input
                    type="color"
                    value={designConfig.ctaTextColor}
                    onChange={(e) => setDesignConfig((d) => ({ ...d, ctaTextColor: e.target.value }))}
                    className="h-8 w-10 cursor-pointer rounded border"
                  />
                  <label className="flex items-center gap-1 text-sm">
                    Radius
                    <input
                      type="range"
                      min={0}
                      max={24}
                      value={designConfig.ctaBorderRadius}
                      onChange={(e) => setDesignConfig((d) => ({ ...d, ctaBorderRadius: Number(e.target.value) }))}
                      className="w-20"
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Secondary CTA (dismiss)</label>
                <input
                  value={designConfig.secondaryCtaText}
                  onChange={(e) => setDesignConfig((d) => ({ ...d, secondaryCtaText: e.target.value }))}
                  placeholder="No thanks"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Image</label>
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
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={designConfig.showCloseButton}
                    onChange={(e) => setDesignConfig((d) => ({ ...d, showCloseButton: e.target.checked }))}
                  />
                  Show close button
                </label>
                {designConfig.showCloseButton && (
                  <input
                    type="number"
                    min={0}
                    value={designConfig.closeDelay}
                    onChange={(e) => setDesignConfig((d) => ({ ...d, closeDelay: Number(e.target.value) }))}
                    placeholder="Delay (sec)"
                    className="mt-1 w-24 rounded border px-2 py-1 text-sm"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Animation</label>
                <select
                  value={designConfig.animation}
                  onChange={(e) => setDesignConfig((d) => ({ ...d, animation: e.target.value }))}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="fade">Fade In</option>
                  <option value="slide-up">Slide Up</option>
                  <option value="slide-down">Slide Down</option>
                  <option value="bounce">Bounce</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
            <div className="w-[60%]">
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMobilePreview((m) => !m)}
                  className="rounded border border-gray-300 px-3 py-1 text-sm"
                >
                  {mobilePreview ? 'Desktop' : 'Mobile'} view
                </button>
              </div>
              <OverlayPreview designConfig={designConfig} mobile={mobilePreview} />
            </div>
          </div>
        )}

        {/* Step 4 — Promo (optional) */}
        {step === 4 && (
          <div className="space-y-4 max-w-md">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showPromoStep}
                onChange={(e) => setShowPromoStep(e.target.checked)}
              />
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
        )}

        {/* Step 5 — Review */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
              <p><strong>Name:</strong> {name || '—'}</p>
<p><strong>Merchant:</strong> {merchants.find((m) => m.id === parseInt(merchantId, 10))?.storeName ?? (merchantId || '—')}</p>
                <p><strong>Type:</strong> {TYPES.find((t) => t.id === type)?.label ?? (type || '—')}</p>
              <p><strong>Promo:</strong> {promoConfig.code || promoCode || 'None'}</p>
            </div>
            <div>
              <p className="mb-2 font-medium">Preview</p>
              <OverlayPreview designConfig={designConfig} className="max-w-lg" />
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
        )}

        {/* Step nav */}
        <div className="mt-8 flex justify-between border-t pt-6">
          <button
            type="button"
            onClick={prev}
            disabled={step === 1}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50 hover:bg-gray-50"
          >
            Back
          </button>
          {step < 5 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
            >
              Next
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
