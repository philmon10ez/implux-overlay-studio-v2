/**
 * Campaign wizard — steps live in src/features/campaign-builder/steps/.
 * See FEATURE_ROADMAP.md (repo root) for further context / CampaignBuilderContext.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import {
  STEPS,
  defaultTrigger,
  defaultDesign,
  defaultPromo,
} from '../features/campaign-builder/constants';
import {
  defaultFrequencyCapForm,
  mergeFrequencyCapFromApi,
  frequencyCapFormFromLegacyTrigger,
  frequencyCapFormToPayload,
} from '../lib/frequencyCapForm';
import SetupStep from '../features/campaign-builder/steps/SetupStep';
import TriggerRulesStep from '../features/campaign-builder/steps/TriggerRulesStep';
import DesignerStep from '../features/campaign-builder/steps/DesignerStep';
import PromoStep from '../features/campaign-builder/steps/PromoStep';
import ReviewStep from '../features/campaign-builder/steps/ReviewStep';

function buildPayload({
  name,
  merchantId,
  type,
  triggerConfig,
  designConfig,
  promoConfig,
  promoCode,
  frequencyCap,
  status,
}) {
  const payload = {
    name: name || 'Untitled Campaign',
    merchantId: parseInt(merchantId, 10),
    type,
    triggerConfig,
    designConfig,
    promoCode: promoConfig.code || promoCode || null,
    promoConfig,
    frequencyCap: frequencyCapFormToPayload(frequencyCap),
  };
  if (status !== undefined) payload.status = status;
  return payload;
}

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
  const [frequencyCap, setFrequencyCap] = useState(defaultFrequencyCapForm);
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
        const mergedPromo = { ...defaultPromo, ...(c.promoConfig || {}) };
        if (!mergedPromo.code && c.promoCode) mergedPromo.code = c.promoCode;
        setPromoConfig(mergedPromo);
        setShowPromoStep(
          !!c.promoCode ||
            c.type === 'promo_banner' ||
            c.type === 'sticky_footer' ||
            c.type === 'spin_wheel'
        );
        if (c.frequencyCap != null && typeof c.frequencyCap === 'object') {
          setFrequencyCap(mergeFrequencyCapFromApi(c.frequencyCap));
        } else {
          setFrequencyCap(frequencyCapFormFromLegacyTrigger(c.triggerConfig?.frequencyCap));
        }
      })
      .catch(() => navigate('/campaigns'))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  const setupComplete = () => {
    const mid = parseInt(merchantId, 10);
    return Boolean(type && !Number.isNaN(mid) && mid > 0);
  };

  const next = () => {
    if (step === 1) {
      if (!merchantId) {
        alert('Select a merchant to continue.');
        return;
      }
      if (!type) {
        alert('Select a campaign type (e.g. Promo Code Banner) to continue.');
        return;
      }
    }
    if (step < 5) setStep(step + 1);
  };
  const prev = () => {
    if (step > 1) setStep(step - 1);
  };

  const saveDraft = () => {
    if (!setupComplete()) {
      alert('Choose a merchant and campaign type on the Setup step before saving.');
      setStep(1);
      return;
    }
    setSaving(true);
    const payload = buildPayload({
      name,
      merchantId,
      type,
      triggerConfig,
      designConfig,
      promoConfig,
      promoCode,
      frequencyCap,
      status: 'draft',
    });
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
    if (!setupComplete()) {
      alert('Choose a merchant and campaign type on the Setup step before publishing.');
      setStep(1);
      return;
    }
    setSaving(true);
    const payload = buildPayload({
      name,
      merchantId,
      type,
      triggerConfig,
      designConfig,
      promoConfig,
      promoCode,
      frequencyCap,
    });
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

      <div className="mt-6 flex gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i + 1)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              step >= i + 1 ? 'bg-poptek-action text-white' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-lg bg-white p-6 shadow-card">
        {step === 1 && (
          <SetupStep
            name={name}
            setName={setName}
            merchantId={merchantId}
            setMerchantId={setMerchantId}
            merchants={merchants}
            type={type}
            setType={setType}
            setShowPromoStep={setShowPromoStep}
            setTriggerConfig={setTriggerConfig}
            setDesignConfig={setDesignConfig}
          />
        )}
        {step === 2 && (
          <TriggerRulesStep
            type={type}
            triggerConfig={triggerConfig}
            setTriggerConfig={setTriggerConfig}
            frequencyCap={frequencyCap}
            setFrequencyCap={setFrequencyCap}
          />
        )}
        {step === 3 && (
          <div className="space-y-6">
            <div className="max-w-2xl rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5">
              <p className="text-sm font-semibold text-gray-900">Design step</p>
              <p className="mt-1 text-sm text-gray-600">
                Adjust copy and layout on the left; the preview on the right updates live. Use{' '}
                <span className="font-medium text-gray-800">Fine-tune appearance</span> only when you need fonts, colors,
                or animation.
              </p>
            </div>
            <DesignerStep
              type={type}
              designConfig={designConfig}
              setDesignConfig={setDesignConfig}
              mobilePreview={mobilePreview}
              setMobilePreview={setMobilePreview}
              promoConfig={promoConfig}
              promoCode={promoCode}
            />
          </div>
        )}
        {step === 4 && (
          <PromoStep
            type={type}
            showPromoStep={showPromoStep}
            setShowPromoStep={setShowPromoStep}
            promoConfig={promoConfig}
            setPromoConfig={setPromoConfig}
          />
        )}
        {step === 5 && (
          <ReviewStep
            name={name}
            merchants={merchants}
            merchantId={merchantId}
            type={type}
            triggerConfig={triggerConfig}
            designConfig={designConfig}
            promoConfig={promoConfig}
            promoCode={promoCode}
            frequencyCap={frequencyCap}
            saveDraft={saveDraft}
            publish={publish}
            saving={saving}
          />
        )}

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
              className="rounded-lg bg-poptek-action px-4 py-2 text-sm font-medium text-white hover:bg-poptek-action/90"
            >
              Next
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
