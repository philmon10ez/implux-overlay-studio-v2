import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams, useBlocker } from 'react-router-dom';
import api from '../lib/api';
import ProductPickerModal from '../features/recommendations/components/ProductPickerModal';
import ProductQuickCreateModal from '../features/recommendations/components/ProductQuickCreateModal';
import SelectedProductsList from '../features/recommendations/components/SelectedProductsList';
import TriggerConditionsField from '../features/recommendations/components/TriggerConditionsField';
import { PLACEMENT_OPTIONS } from '../features/recommendations/constants';
import FrequencyCapFields from '../components/FrequencyCapFields';
import {
  defaultFrequencyCapForm,
  mergeFrequencyCapFromApi,
  frequencyCapFormToPayload,
  frequencyCapPayloadSummary,
} from '../lib/frequencyCapForm';
import WizardStepper from '../features/recommendations/wizard/WizardStepper';
import { REC_WIZARD_STEPS, REC_WIZARD_STEP_COUNT } from '../features/recommendations/wizard/wizardConstants';
import RecommendationLivePreview from '../features/recommendations/wizard/RecommendationLivePreview';
import DesignerSplitShell from '../features/recommendations/wizard/DesignerSplitShell';
import { validateWizardStep } from '../features/recommendations/wizard/wizardValidation';
import {
  RECOMMENDATION_PRESET_LIST,
  RECOMMENDATION_PRESETS,
  applyRecommendationPreset,
  SCRATCH_ID,
  getPresetLabel,
} from '../features/recommendations/presets/recommendationPresets';
import RecommendationAssistantPanel from '../features/conversion-intelligence/RecommendationAssistantPanel';
import {
  applyRecommendationAssistantPatch,
  applyAddProductIds,
} from '../features/conversion-intelligence/applyRecommendationAssistantPatch';
import SectionCard from '../features/recommendations/components/SectionCard';
import InlineNotice, { LoadingBlock } from '../features/recommendations/components/InlineNotice';
import StatusBadge from '../components/StatusBadge';
import { fingerprintRecommendationForm } from '../features/recommendations/recommendationSetFingerprint';

const AUTOSAVE_DEBOUNCE_MS = 1100;

const WIZARD_DRAFT_KEY = 'implux_rec_set_wizard_draft_v1';
const emptyPresentation = () => ({ headline: '', subcopy: '', ctaLabel: '' });

function clampStep(n) {
  const x = Math.floor(Number(n));
  if (Number.isNaN(x) || x < 1) return 1;
  if (x > REC_WIZARD_STEP_COUNT) return REC_WIZARD_STEP_COUNT;
  return x;
}

export default function RecommendationSetEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const merchantFromQuery = searchParams.get('merchantId') || '';

  const step = clampStep(searchParams.get('step') || '1');
  const setStep = useCallback(
    (n) => {
      const next = clampStep(n);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('step', String(next));
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const [merchants, setMerchants] = useState([]);
  const [merchantId, setMerchantId] = useState(merchantFromQuery);
  const [name, setName] = useState('');
  const [placementType, setPlacementType] = useState('product_page');
  const [triggerJson, setTriggerJson] = useState('{}');
  const [triggerError, setTriggerError] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoadError, setCatalogLoadError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const [stepHint, setStepHint] = useState(null);
  const [frequencyCap, setFrequencyCap] = useState(defaultFrequencyCapForm);
  const [presetKey, setPresetKey] = useState(null);
  const [presentation, setPresentation] = useState(emptyPresentation);
  const [presetSelectionId, setPresetSelectionId] = useState(SCRATCH_ID);
  const [assistantNotice, setAssistantNotice] = useState(null);
  const [triggerRulesExpanded, setTriggerRulesExpanded] = useState(false);
  const [serverStatus, setServerStatus] = useState('draft');
  /** idle | saving | saved | error — auto-save + manual feedback */
  const [remoteSaveStatus, setRemoteSaveStatus] = useState('idle');
  const [remoteSaveError, setRemoteSaveError] = useState(null);
  /** Bumps when last-saved fingerprint ref updates so isDirty recomputes (refs are not reactive). */
  const [saveSyncToken, setSaveSyncToken] = useState(0);
  const bumpSaveSync = useCallback(() => setSaveSyncToken((t) => t + 1), []);
  const draftRestoredRef = useRef(false);
  const newBaselineDoneRef = useRef(false);
  const serverLoadBaselineAppliedRef = useRef(false);
  const lastSavedFingerprintRef = useRef(null);
  const autoSaveGenerationRef = useRef(0);
  const savedToastTimerRef = useRef(null);

  const selectedIds = useMemo(() => new Set(selectedProducts.map((p) => p.id)), [selectedProducts]);

  const triggerSummaryLine = useMemo(() => {
    try {
      const t = triggerJson.trim();
      if (!t || t === '{}') {
        return 'Showing to any shopper who reaches this placement — no extra filters.';
      }
      const o = JSON.parse(t);
      if (o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length === 0) {
        return 'Showing to any shopper who reaches this placement — no extra filters.';
      }
      const n = Object.keys(o).length;
      return `Custom targeting active (${n} rule field${n === 1 ? '' : 's'}).`;
    } catch {
      return 'Rules have a JSON error — expand below to fix before publishing.';
    }
  }, [triggerJson]);

  /** For UI: JSON parses as object (no save attempted). */
  const triggerJsonSyntaxOk = useMemo(() => {
    try {
      const p = JSON.parse(triggerJson.trim() || '{}');
      return p !== null && typeof p === 'object' && !Array.isArray(p);
    } catch {
      return false;
    }
  }, [triggerJson]);

  const formFingerprint = useMemo(
    () =>
      fingerprintRecommendationForm({
        name,
        placementType,
        triggerJson,
        frequencyCap,
        presentation,
        presetKey,
        selectedProducts,
        presetSelectionId,
      }),
    [
      name,
      placementType,
      triggerJson,
      frequencyCap,
      presentation,
      presetKey,
      selectedProducts,
      presetSelectionId,
    ]
  );

  const isDirty = useMemo(() => {
    if (lastSavedFingerprintRef.current === null) return false;
    return formFingerprint !== lastSavedFingerprintRef.current;
  }, [formFingerprint, saveSyncToken]);

  const listHref = `/recommendations${merchantId ? `?merchantId=${merchantId}` : ''}`;

  const applyPreset = useCallback((presetId) => {
    applyRecommendationPreset(presetId, {
      setPlacementType,
      setName,
      setTriggerJson,
      setFrequencyCap,
      setPresentation,
      setPresetKey,
    });
    setPresetSelectionId(presetId === SCRATCH_ID ? SCRATCH_ID : presetId);
  }, []);

  const validationCtx = useMemo(
    () => ({
      isEdit,
      merchantId,
      name,
      selectedProducts,
      triggerJson,
    }),
    [isEdit, merchantId, name, selectedProducts, triggerJson]
  );

  useEffect(() => {
    api.merchants.list().then((r) => setMerchants(r.merchants || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!merchantId) {
      setCatalogProducts([]);
      setCatalogLoadError('');
      setCatalogLoading(false);
      return;
    }
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogLoadError('');
    api.products
      .list(merchantId)
      .then((r) => {
        if (!cancelled) setCatalogProducts(r.products || []);
      })
      .catch((e) => {
        if (!cancelled) {
          setCatalogProducts([]);
          setCatalogLoadError(e.body?.error || e.message || 'Could not load your catalog.');
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [merchantId]);

  useEffect(() => {
    if (!assistantNotice) return;
    const t = window.setTimeout(() => setAssistantNotice(null), 5200);
    return () => window.clearTimeout(t);
  }, [assistantNotice]);

  useEffect(() => {
    if (triggerError) setTriggerRulesExpanded(true);
  }, [triggerError]);

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    setLoadingEdit(true);
    api.recommendationSets
      .get(id, merchantFromQuery || undefined)
      .then((r) => {
        if (cancelled) return;
        const s = r.recommendationSet;
        setMerchantId(String(s.merchantId));
        setName(s.name);
        setPlacementType(s.placementType);
        const condRaw = s.triggerConditions && typeof s.triggerConditions === 'object' && !Array.isArray(s.triggerConditions) ? s.triggerConditions : {};
        setTriggerJson(JSON.stringify(condRaw, null, 2));
        setTriggerRulesExpanded(Object.keys(condRaw).length > 0);
        setSelectedProducts(
          (s.products || []).map((x) => ({
            id: x.product.id,
            title: x.product.title,
            imageUrl: x.product.imageUrl,
            sku: x.product.sku,
          }))
        );
        setFrequencyCap(mergeFrequencyCapFromApi(s.frequencyCap));
        setPresetKey(s.presetKey ?? null);
        const pm = s.presetMetadata;
        const pr = pm && typeof pm === 'object' && !Array.isArray(pm) ? pm.presentation : null;
        if (pr && typeof pr === 'object' && !Array.isArray(pr)) {
          setPresentation({
            headline: typeof pr.headline === 'string' ? pr.headline : '',
            subcopy: typeof pr.subcopy === 'string' ? pr.subcopy : '',
            ctaLabel: typeof pr.ctaLabel === 'string' ? pr.ctaLabel : '',
          });
        } else if (s.presetKey && RECOMMENDATION_PRESETS[s.presetKey]) {
          setPresentation({ ...RECOMMENDATION_PRESETS[s.presetKey].presentation });
        } else {
          setPresentation(emptyPresentation());
        }
        setPresetSelectionId(s.presetKey || SCRATCH_ID);
        setServerStatus((s.status || 'draft').toLowerCase() === 'active' ? 'active' : 'draft');
      })
      .catch(() => navigate('/recommendations'))
      .finally(() => {
        if (!cancelled) setLoadingEdit(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, navigate]);

  useEffect(() => {
    if (isEdit || merchantFromQuery) return;
    if (merchants.length === 1) setMerchantId(String(merchants[0].id));
  }, [isEdit, merchantFromQuery, merchants]);

  /** Restore in-progress wizard (new sets only). */
  useEffect(() => {
    if (isEdit || draftRestoredRef.current) return;
    try {
      const raw = sessionStorage.getItem(WIZARD_DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return;
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - (d.at || 0) > maxAge) {
        sessionStorage.removeItem(WIZARD_DRAFT_KEY);
        return;
      }
      if (typeof d.name === 'string') setName(d.name);
      if (d.placementType && PLACEMENT_OPTIONS.some((o) => o.value === d.placementType)) setPlacementType(d.placementType);
      if (typeof d.triggerJson === 'string') setTriggerJson(d.triggerJson);
      if (d.frequencyCap && typeof d.frequencyCap === 'object') {
        setFrequencyCap({ ...defaultFrequencyCapForm, ...d.frequencyCap });
      }
      if (d.presetKey !== undefined) setPresetKey(d.presetKey || null);
      if (d.presentation && typeof d.presentation === 'object') {
        setPresentation({ ...emptyPresentation(), ...d.presentation });
      }
      if (typeof d.presetSelectionId === 'string') setPresetSelectionId(d.presetSelectionId);
      if (Array.isArray(d.selectedProducts)) setSelectedProducts(d.selectedProducts);
      if (d.merchantId && !merchantFromQuery) setMerchantId(String(d.merchantId));
      if (!searchParams.get('step') && d.step >= 1 && d.step <= REC_WIZARD_STEP_COUNT) {
        setSearchParams(
          (prev) => {
            const p = new URLSearchParams(prev);
            p.set('step', String(d.step));
            return p;
          },
          { replace: true }
        );
      }
    } catch {
      /* ignore */
    }
    draftRestoredRef.current = true;
  }, [isEdit, merchantFromQuery, searchParams, setSearchParams]);

  /** Baseline fingerprint after local session restore (new sets only). */
  useEffect(() => {
    if (isEdit || loadingEdit) return;
    if (!draftRestoredRef.current) return;
    if (newBaselineDoneRef.current) return;
    newBaselineDoneRef.current = true;
    lastSavedFingerprintRef.current = formFingerprint;
    bumpSaveSync();
  }, [isEdit, loadingEdit, formFingerprint, bumpSaveSync]);

  /** One-time baseline after server load (edit). */
  useEffect(() => {
    serverLoadBaselineAppliedRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!isEdit || !id || loadingEdit) return;
    if (serverLoadBaselineAppliedRef.current) return;
    serverLoadBaselineAppliedRef.current = true;
    lastSavedFingerprintRef.current = formFingerprint;
    bumpSaveSync();
  }, [isEdit, id, loadingEdit, formFingerprint, bumpSaveSync]);

  /** Persist wizard progress locally (new sets). */
  useEffect(() => {
    if (isEdit) return;
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem(
          WIZARD_DRAFT_KEY,
          JSON.stringify({
            at: Date.now(),
            merchantId,
            name,
            placementType,
            triggerJson,
            frequencyCap,
            selectedProducts,
            step,
            presetKey,
            presentation,
            presetSelectionId,
          })
        );
      } catch {
        /* ignore */
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [
    isEdit,
    merchantId,
    name,
    placementType,
    triggerJson,
    frequencyCap,
    selectedProducts,
    step,
    presetKey,
    presentation,
    presetSelectionId,
  ]);

  const clearWizardDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(WIZARD_DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const parseTriggers = useCallback(() => {
    setTriggerError('');
    try {
      const parsed = JSON.parse(triggerJson.trim() || '{}');
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setTriggerError('Trigger conditions must be a JSON object.');
        return null;
      }
      return parsed;
    } catch {
      setTriggerError('Invalid JSON.');
      return null;
    }
  }, [triggerJson]);

  const tryParseConditionsQuiet = useCallback(() => {
    try {
      const parsed = JSON.parse(triggerJson.trim() || '{}');
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [triggerJson]);

  /**
   * @param {'draft' | 'publish' | 'autoSave'} mode
   * @param {{ silent?: boolean }} [options] silent: no trigger error side effects (auto-save)
   */
  const buildPayload = useCallback(
    (mode, options = {}) => {
      const { silent = false } = options;
      const conditions = silent ? tryParseConditionsQuiet() : parseTriggers();
      if (!conditions) return null;
      let status;
      if (mode === 'publish') status = 'active';
      else if (mode === 'autoSave') status = isEdit ? serverStatus : 'draft';
      else status = 'draft';

      const productIds = selectedProducts.map((p) => p.id);
      const hasPresentation =
        presentation.headline.trim() || presentation.subcopy.trim() || presentation.ctaLabel.trim();
      const presetMetadata =
        presetKey || hasPresentation
          ? {
              schemaVersion: 1,
              presentation: {
                headline: presentation.headline.trim(),
                subcopy: presentation.subcopy.trim(),
                ctaLabel: presentation.ctaLabel.trim(),
              },
            }
          : null;
      const base = {
        name: name.trim(),
        placementType,
        triggerConditions: conditions,
        frequencyCap: frequencyCapFormToPayload(frequencyCap),
        presetKey: presetKey || null,
        presetMetadata,
        status,
        productIds,
      };
      if (!isEdit) {
        const mid = parseInt(merchantId, 10);
        if (Number.isNaN(mid) || mid < 1) {
          if (!silent) setBanner({ type: 'error', text: 'Select a store to continue.' });
          return null;
        }
        return { ...base, merchantId: mid };
      }
      return base;
    },
    [
      isEdit,
      merchantId,
      name,
      placementType,
      presentation,
      presetKey,
      selectedProducts,
      frequencyCap,
      serverStatus,
      tryParseConditionsQuiet,
      parseTriggers,
    ]
  );

  const manualSaveLockRef = useRef(false);

  const applySavedFingerprint = useCallback(() => {
    lastSavedFingerprintRef.current = fingerprintRecommendationForm({
      name,
      placementType,
      triggerJson,
      frequencyCap,
      presentation,
      presetKey,
      selectedProducts,
      presetSelectionId,
    });
    bumpSaveSync();
  }, [
    name,
    placementType,
    triggerJson,
    frequencyCap,
    presentation,
    presetKey,
    selectedProducts,
    presetSelectionId,
    bumpSaveSync,
  ]);

  const save = async (asPublish) => {
    setBanner(null);
    setStepHint(null);
    setRemoteSaveError(null);
    if (!name.trim()) {
      setBanner({ type: 'error', text: 'Name is required.' });
      setStep(2);
      return;
    }
    const mode = asPublish ? 'publish' : 'draft';
    const payload = buildPayload(mode, { silent: false });
    if (!payload) {
      const conditionsRetry = parseTriggers();
      if (!conditionsRetry) {
        setBanner({ type: 'error', text: triggerError || 'Fix trigger rules before saving.' });
        setStep(5);
      } else if (!isEdit) {
        const mid = parseInt(merchantId, 10);
        if (Number.isNaN(mid) || mid < 1) {
          setBanner({ type: 'error', text: 'Select a store to continue.' });
          setStep(2);
        }
      }
      return;
    }

    manualSaveLockRef.current = true;
    setSaving(true);
    setRemoteSaveStatus('saving');
    try {
      if (isEdit) {
        const res = await api.recommendationSets.update(id, payload);
        const s = res.recommendationSet?.status || payload.status;
        setServerStatus(String(s).toLowerCase() === 'active' ? 'active' : 'draft');
        applySavedFingerprint();
        if (asPublish) {
          clearWizardDraft();
          navigate(listHref);
        } else {
          setBanner({ type: 'success', text: 'Draft saved. Continue when you are ready.' });
          setRemoteSaveStatus('saved');
        }
      } else {
        const res = await api.recommendationSets.create(payload);
        clearWizardDraft();
        const created = res.recommendationSet;
        setServerStatus(String(created?.status || 'draft').toLowerCase() === 'active' ? 'active' : 'draft');
        applySavedFingerprint();
        if (asPublish) navigate(listHref);
        else
          navigate(`/recommendations/${created.id}/edit?merchantId=${payload.merchantId}&step=${step}`, {
            replace: true,
          });
        if (!asPublish) setRemoteSaveStatus('saved');
      }
    } catch (e) {
      setBanner({ type: 'error', text: e.body?.error || e.message || 'Save failed.' });
      setRemoteSaveStatus('error');
      setRemoteSaveError(e.body?.error || e.message || 'Save failed');
    } finally {
      setSaving(false);
      manualSaveLockRef.current = false;
    }
  };

  /** Debounced server auto-save (draft or in-place update for published sets). */
  useEffect(() => {
    if (loadingEdit) return;
    if (step < 2) return;
    if (!isDirty) return;
    if (!name.trim() || !merchantId) return;
    if (manualSaveLockRef.current) return;

    const gen = ++autoSaveGenerationRef.current;
    const t = window.setTimeout(async () => {
      if (gen !== autoSaveGenerationRef.current) return;
      if (manualSaveLockRef.current) return;
      const payload = buildPayload('autoSave', { silent: true });
      if (!payload) return;

      setRemoteSaveStatus('saving');
      setRemoteSaveError(null);
      try {
        if (isEdit) {
          const res = await api.recommendationSets.update(id, payload);
          const st = res.recommendationSet?.status;
          setServerStatus(String(st).toLowerCase() === 'active' ? 'active' : 'draft');
        } else {
          const res = await api.recommendationSets.create(payload);
          clearWizardDraft();
          const created = res.recommendationSet;
          setServerStatus('draft');
          navigate(`/recommendations/${created.id}/edit?merchantId=${payload.merchantId}&step=${step}`, {
            replace: true,
          });
        }
        lastSavedFingerprintRef.current = formFingerprint;
        bumpSaveSync();
        setRemoteSaveStatus('saved');
      } catch (e) {
        setRemoteSaveStatus('error');
        setRemoteSaveError(e.body?.error || e.message || 'Auto-save failed');
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [
    formFingerprint,
    step,
    loadingEdit,
    isDirty,
    name,
    merchantId,
    isEdit,
    id,
    buildPayload,
    navigate,
    bumpSaveSync,
  ]);

  useEffect(() => {
    if (remoteSaveStatus !== 'saved') return;
    savedToastTimerRef.current = window.setTimeout(() => setRemoteSaveStatus('idle'), 2600);
    return () => window.clearTimeout(savedToastTimerRef.current);
  }, [remoteSaveStatus]);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('You have unsaved changes. Leave this page? They may not be saved to the server yet.')) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  const goNext = () => {
    setStepHint(null);
    const v = validateWizardStep(step, validationCtx);
    if (!v.ok) {
      setStepHint(v.message);
      return;
    }
    if (step < REC_WIZARD_STEP_COUNT) setStep(step + 1);
  };

  const goBack = () => {
    setStepHint(null);
    if (step > 1) setStep(step - 1);
  };

  const addProduct = (p) => {
    if (selectedIds.has(p.id)) return;
    setSelectedProducts((prev) => [...prev, { id: p.id, title: p.title, imageUrl: p.imageUrl, sku: p.sku }]);
  };

  const removeAt = (idx) => {
    setSelectedProducts((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveUp = (idx) => {
    if (idx <= 0) return;
    setSelectedProducts((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx) => {
    setSelectedProducts((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const onProductCreated = (product) => {
    setCatalogProducts((prev) => [product, ...prev]);
    addProduct(product);
  };

  const storeLabel = merchants.find((m) => String(m.id) === String(merchantId))?.storeName ?? (merchantId ? `#${merchantId}` : '—');

  const livePreview = useMemo(
    () => (
      <RecommendationLivePreview
        placementType={placementType}
        products={selectedProducts}
        internalSetName={name.trim()}
        headline={presentation.headline}
        subcopy={presentation.subcopy}
        ctaLabel={presentation.ctaLabel}
        triggerJson={triggerJson}
        frequencyCap={frequencyCap}
      />
    ),
    [
      placementType,
      selectedProducts,
      name,
      presentation.headline,
      presentation.subcopy,
      presentation.ctaLabel,
      triggerJson,
      frequencyCap,
    ]
  );

  const assistantContext = useMemo(
    () => ({
      placementType,
      name: name.trim(),
      presentation,
      frequencyCap,
      triggerJson,
      selectedProducts,
      presetKey: presetKey ?? undefined,
    }),
    [placementType, name, presentation, frequencyCap, triggerJson, selectedProducts, presetKey]
  );

  const handleAssistantApply = useCallback(
    (s) => {
      if (!s?.apply || typeof s.apply !== 'object') {
        return { ok: false, message: 'Nothing to apply' };
      }
      const { addProductIds, ...patch } = s.apply;
      const patchResult = applyRecommendationAssistantPatch(patch, {
        setPlacementType,
        setPresentation,
        setFrequencyCap,
        setTriggerJson,
      });
      if (patchResult.errors.length) {
        return { ok: false, message: patchResult.errors.join(' ') };
      }

      let added = 0;
      if (Array.isArray(addProductIds) && addProductIds.length > 0) {
        const r = applyAddProductIds(addProductIds, catalogProducts, selectedIds, addProduct);
        added = r.added;
      }

      const applied = patchResult.applied || added > 0;
      if (!applied) {
        return {
          ok: false,
          message:
            'Could not apply anything new (e.g. products already selected or not in catalog, or empty suggestion).',
        };
      }

      const parts = [...patchResult.summaryLines];
      if (added > 0) {
        parts.push(`Added ${added} product${added === 1 ? '' : 's'}`);
      }
      return { ok: true, message: parts.length ? parts.join(' · ') : 'Applied to your draft.' };
    },
    [catalogProducts, selectedIds, addProduct]
  );

  if (loadingEdit) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-0">
        <div className="mb-6 h-4 w-40 animate-pulse rounded-lg bg-gray-200" />
        <div className="mb-8 h-3 w-full max-w-md animate-pulse rounded bg-gray-100" />
        <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
          <LoadingBlock label="Loading recommendation set" sub="Fetching products, rules, and display settings." />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-1 pb-32 sm:px-0">
      <div className="mb-6">
        <Link to={listHref} className="text-sm font-medium text-accent hover:underline">
          ← Back to recommendations
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
          {isEdit ? 'Edit recommendation set' : 'New recommendation set'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-gray-800">
            Step {step} of {REC_WIZARD_STEP_COUNT}
            {REC_WIZARD_STEPS[step - 1] ? ` · ${REC_WIZARD_STEPS[step - 1].title}` : ''}
          </span>
          {REC_WIZARD_STEPS[step - 1]?.subtitle ? (
            <span className="text-gray-500"> — {REC_WIZARD_STEPS[step - 1].subtitle}</span>
          ) : null}
        </p>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Build a product recommendation block for your storefront: placement, catalog picks, copy, and optional limits.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2" aria-live="polite">
          {isEdit && id ? <StatusBadge status={serverStatus} /> : null}
          {step >= 2 && !loadingEdit ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {remoteSaveStatus === 'saving' ? (
                <span className="inline-flex items-center gap-1.5 text-gray-600">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-accent" aria-hidden />
                  Saving to server…
                </span>
              ) : null}
              {remoteSaveStatus === 'saved' ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  All changes saved
                </span>
              ) : null}
              {remoteSaveStatus === 'error' ? (
                <span className="inline-flex flex-wrap items-center gap-2 text-amber-800">
                  <span>Couldn&apos;t auto-save.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setRemoteSaveStatus('idle');
                      setRemoteSaveError(null);
                      save(false);
                    }}
                    className="font-medium text-accent underline decoration-accent/40 underline-offset-2 hover:text-accent/90"
                  >
                    Retry save
                  </button>
                </span>
              ) : null}
              {remoteSaveStatus === 'idle' && isDirty ? (
                <span className="text-gray-600">Unsaved changes</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <WizardStepper currentStep={step} />

      {banner ? (
        <div className="mb-6">
          {banner.type === 'success' ? (
            <InlineNotice variant="success" title="Saved">
              {banner.text}
            </InlineNotice>
          ) : (
            <InlineNotice variant="error" title="Couldn’t save">
              {banner.text}
            </InlineNotice>
          )}
        </div>
      ) : null}

      {assistantNotice ? (
        <div className="mb-6">
          <InlineNotice variant="success" title="Assistant applied">
            {assistantNotice.text}
          </InlineNotice>
        </div>
      ) : null}

      {stepHint ? (
        <div className="mb-6">
          <InlineNotice variant="warning" title="Before you continue">
            {stepHint}
          </InlineNotice>
        </div>
      ) : null}

      <div
        className={`min-h-[320px] rounded-2xl border border-gray-200/80 bg-white shadow-sm ${
          step >= 2 && step <= 6 ? 'p-4 sm:p-6 lg:p-8' : 'p-6 sm:p-8'
        }`}
      >
        {step === 1 && (
          <div className="space-y-8">
            <header className="max-w-2xl">
              <h2 className="text-lg font-semibold text-gray-900">Start from a template</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                Each option pre-fills placement, sample targeting, frequency, and suggested messaging. You stay in control —
                nothing is final until you publish.
              </p>
            </header>
            <div className="grid gap-3 sm:grid-cols-2">
              {RECOMMENDATION_PRESET_LIST.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`rounded-2xl border-2 p-4 text-left transition-all ${
                    presetSelectionId === p.id
                      ? 'border-accent bg-accent/[0.06] shadow-sm ring-1 ring-accent/25'
                      : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900">{p.title}</span>
                    {p.badge ? (
                      <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                        {p.badge}
                      </span>
                    ) : null}
                  </div>
                  <span className="mt-2 block text-xs leading-relaxed text-gray-500">{p.tagline}</span>
                  <span className="mt-2 inline-block text-[10px] font-medium text-gray-400">
                    {PLACEMENT_OPTIONS.find((o) => o.value === p.placementType)?.label}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => applyPreset(SCRATCH_ID)}
                className={`rounded-2xl border-2 border-dashed p-4 text-left transition-all sm:col-span-2 ${
                  presetSelectionId === SCRATCH_ID
                    ? 'border-accent bg-accent/[0.04] ring-1 ring-accent/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-sm font-semibold text-gray-900">Start from scratch</span>
                <span className="mt-1 block text-xs text-gray-500">
                  Empty triggers, default frequency, and no suggested copy — full control.
                </span>
              </button>
            </div>
            <SectionCard
              title="Conversion Intelligence"
              description="Optional AI suggestions on later steps — expand to learn how it works."
              collapsible
              defaultOpen={false}
            >
              <p className="text-sm leading-relaxed text-gray-600">
                From step 2 onward, you can open the assistant to get ideas for placement, products, copy, frequency, and
                rules. Your draft only changes when you choose <span className="font-medium text-gray-800">Apply</span> on
                a suggestion.
              </p>
            </SectionCard>
          </div>
        )}

        {step >= 2 && step <= 6 && (
          <>
            <RecommendationAssistantPanel
              className="mb-6"
              step={step}
              merchantId={merchantId}
              context={assistantContext}
              onApplySuggestion={handleAssistantApply}
              onApplySuccess={(msg) => setAssistantNotice({ text: msg })}
            />
            {step === 2 && (
          <DesignerSplitShell
            preview={livePreview}
            controls={
              <div className="space-y-6">
                <header className="max-w-xl">
                  <h2 className="text-lg font-semibold text-gray-900">Store & placement</h2>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    Pick where this set appears on your site. The preview on the right switches layout when you change
                    placement.
                  </p>
                </header>
                <SectionCard
                  title="Store & internal name"
                  description="The name is for your team only — customers never see it."
                >
                  {!isEdit ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-800">Store</label>
                      <p className="mt-0.5 text-xs text-gray-500">Catalog and products load from this shop.</p>
                      <select
                        value={merchantId}
                        onChange={(e) => setMerchantId(e.target.value)}
                        className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                      >
                        <option value="">Select store…</option>
                        {merchants.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.storeName}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-gray-500">Store</span>{' '}
                      <span className="font-semibold text-gray-900">{storeLabel}</span>
                    </p>
                  )}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-800">Internal name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Cart — matching accessories"
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </div>
                </SectionCard>
                <SectionCard
                  title="Where it appears"
                  description="Choose the page or step that should show this recommendation block."
                >
                  <div className="grid gap-3">
                    {PLACEMENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPlacementType(opt.value)}
                        className={`rounded-2xl border-2 p-4 text-left transition-all ${
                          placementType === opt.value
                            ? 'border-accent bg-accent/[0.06] shadow-sm ring-1 ring-accent/25'
                            : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'
                        }`}
                      >
                        <span className="block text-sm font-semibold text-gray-900">{opt.label}</span>
                        <span className="mt-1 block text-xs leading-snug text-gray-500">{opt.hint}</span>
                      </button>
                    ))}
                  </div>
                </SectionCard>
              </div>
            }
          />
            )}

            {step === 3 && (
          <DesignerSplitShell
            preview={livePreview}
            controls={
              <div className="space-y-6">
                <header className="max-w-xl">
                  <h2 className="text-lg font-semibold text-gray-900">Choose products</h2>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    One product fills the hero slot; several products become a swipeable row in the preview. Reorder with
                    the arrows so the best match shows first.
                  </p>
                </header>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!merchantId}
                    onClick={() => setPickerOpen(true)}
                    className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Browse catalog
                  </button>
                  <button
                    type="button"
                    disabled={!merchantId}
                    onClick={() => setQuickCreateOpen(true)}
                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Quick-add product
                  </button>
                </div>
                {!merchantId ? (
                  <InlineNotice variant="warning" title="Choose a store first" dense>
                    Go back one step and select a store so we can load your product catalog.
                  </InlineNotice>
                ) : null}
                {merchantId && catalogLoadError ? (
                  <InlineNotice
                    variant="error"
                    title="Catalog couldn’t load"
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          setCatalogLoadError('');
                          setCatalogLoading(true);
                          api.products
                            .list(merchantId)
                            .then((r) => setCatalogProducts(r.products || []))
                            .catch((e) => setCatalogLoadError(e.body?.error || e.message || 'Request failed'))
                            .finally(() => setCatalogLoading(false));
                        }}
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-900 shadow-sm ring-1 ring-red-200 hover:bg-red-50"
                      >
                        Try again
                      </button>
                    }
                  >
                    {catalogLoadError} You can still edit other steps; product search will work after the catalog loads.
                  </InlineNotice>
                ) : null}
                {merchantId && catalogLoading ? (
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-accent" />
                      Loading products from your store…
                    </span>
                  </div>
                ) : null}
                <SelectedProductsList items={selectedProducts} onRemove={removeAt} onMoveUp={moveUp} onMoveDown={moveDown} />
              </div>
            }
          />
        )}

        {step === 4 && (
          <DesignerSplitShell
            preview={livePreview}
            controls={
              <div className="space-y-6">
                <header className="max-w-xl">
                  <h2 className="text-lg font-semibold text-gray-900">Messaging & order</h2>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    Write the headline and button shoppers see. The live preview updates as you type.
                  </p>
                </header>
                <SectionCard
                  title="What shoppers read"
                  description="Saved with this set for reporting and optional storefront styling."
                >
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-800">Headline</label>
                      <input
                        value={presentation.headline}
                        onChange={(e) => setPresentation((prev) => ({ ...prev, headline: e.target.value }))}
                        className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        placeholder="e.g. Complete your look"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800">Supporting text</label>
                      <p className="mt-0.5 text-xs text-gray-500">One short line under the headline (optional).</p>
                      <textarea
                        value={presentation.subcopy}
                        onChange={(e) => setPresentation((prev) => ({ ...prev, subcopy: e.target.value }))}
                        rows={2}
                        className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        placeholder="Why these picks matter"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800">Button label</label>
                      <input
                        value={presentation.ctaLabel}
                        onChange={(e) => setPresentation((prev) => ({ ...prev, ctaLabel: e.target.value }))}
                        className="mt-2 w-full max-w-xs rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                        placeholder="e.g. Add to cart"
                      />
                    </div>
                  </div>
                </SectionCard>
                <SectionCard
                  title="Carousel order"
                  description="First product sits on the left — match your merchandising priority."
                >
                  <SelectedProductsList
                    items={selectedProducts}
                    onRemove={removeAt}
                    onMoveUp={moveUp}
                    onMoveDown={moveDown}
                  />
                </SectionCard>
              </div>
            }
          />
        )}

        {step === 5 && (
          <DesignerSplitShell
            preview={livePreview}
            controls={
              <div className="space-y-6">
                <header className="max-w-xl">
                  <h2 className="text-lg font-semibold text-gray-900">Limits & targeting</h2>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    Start with how often the block may show. Open advanced targeting only if your team uses JSON rules on
                    the storefront.
                  </p>
                </header>
                <SectionCard
                  title="Frequency"
                  description="Prevent shoppers from seeing the same recommendation too often."
                >
                  <FrequencyCapFields idPrefix="rec-fc" value={frequencyCap} onChange={setFrequencyCap} />
                </SectionCard>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
                  <button
                    type="button"
                    onClick={() => setTriggerRulesExpanded((e) => !e)}
                    className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50/90"
                    aria-expanded={triggerRulesExpanded}
                  >
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Advanced: JSON targeting</h3>
                      <p className="mt-1 text-sm text-gray-600">{triggerSummaryLine}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        Skip this unless your storefront evaluates rule JSON (cart value, SKUs, tags, etc.).
                      </p>
                    </div>
                    <span className="shrink-0 pt-1 text-xs text-gray-400" aria-hidden>
                      {triggerRulesExpanded ? '▼' : '▶'}
                    </span>
                  </button>
                  {triggerRulesExpanded ? (
                    <div className="border-t border-gray-100 px-5 py-4">
                      <TriggerConditionsField
                        value={triggerJson}
                        onChange={setTriggerJson}
                        error={triggerError}
                        syntaxOk={triggerJsonSyntaxOk && !triggerError}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            }
          />
        )}

        {step === 6 && (
          <DesignerSplitShell
            preview={livePreview}
            controls={
              <div className="space-y-6">
                <header className="max-w-xl">
                  <h2 className="text-lg font-semibold text-gray-900">Review & go live</h2>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    Check the summary against the preview. Save a draft to keep editing, or publish when you are ready for
                    storefront traffic.
                  </p>
                </header>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Preset</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{getPresetLabel(presetKey) ?? 'From scratch'}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Internal name</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{name.trim() || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Store</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{storeLabel}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Placement</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {PLACEMENT_OPTIONS.find((p) => p.value === placementType)?.label ?? placementType}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card sm:p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Messaging</p>
                  <p className="mt-1 text-sm text-gray-800">
                    {presentation.headline.trim() || presentation.subcopy.trim() || presentation.ctaLabel.trim()
                      ? `${presentation.headline.trim() || '—'} · ${presentation.ctaLabel.trim() || '—'}`
                      : 'No headline or button copy yet — go back to Design or add text.'}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Products</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {selectedProducts.length} in carousel
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Frequency</p>
                    <p className="mt-1 text-sm text-gray-800">
                      {frequencyCapPayloadSummary(frequencyCapFormToPayload(frequencyCap))}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card sm:p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Targeting</p>
                  <p className="mt-1 text-sm text-gray-800">{triggerSummaryLine}</p>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-accent hover:underline">
                      View raw JSON
                    </summary>
                    <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-gray-50 p-3 font-mono text-[11px] leading-relaxed text-gray-700 ring-1 ring-gray-100">
                      {triggerJson.trim() || '{}'}
                    </pre>
                  </details>
                </div>
              </div>
            }
          />
            )}
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 py-4 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md md:left-56">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link to={listHref} className="order-3 text-center text-sm text-gray-500 hover:text-gray-800 sm:order-1 sm:text-left">
            Cancel
          </Link>
          <div className="order-1 flex flex-wrap items-center justify-center gap-2 sm:order-2 sm:justify-end">
            <button
              type="button"
              disabled={step <= 1}
              onClick={goBack}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            {step < REC_WIZARD_STEP_COUNT ? (
              <button
                type="button"
                onClick={goNext}
                className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
              >
                Continue
              </button>
            ) : null}
            <button
              type="button"
              disabled={saving}
              onClick={() => save(false)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            {step === REC_WIZARD_STEP_COUNT ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => save(true)}
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-accent/90 disabled:opacity-50"
              >
                {saving ? 'Publishing…' : 'Publish'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <ProductPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        products={catalogProducts}
        selectedIds={selectedIds}
        onAdd={addProduct}
        loading={catalogLoading}
        loadError={catalogLoadError}
        onRetryCatalog={() => {
          if (!merchantId) return;
          setCatalogLoadError('');
          setCatalogLoading(true);
          api.products
            .list(merchantId)
            .then((r) => setCatalogProducts(r.products || []))
            .catch((e) => setCatalogLoadError(e.body?.error || e.message || 'Could not load products.'))
            .finally(() => setCatalogLoading(false));
        }}
      />
      <ProductQuickCreateModal
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        merchantId={merchantId}
        onCreated={onProductCreated}
      />
    </div>
  );
}
