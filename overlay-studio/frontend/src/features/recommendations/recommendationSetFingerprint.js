/**
 * Stable fingerprint for dirty-checking and last-saved comparison (recommendation set wizard).
 */
export function fingerprintRecommendationForm({
  name,
  placementType,
  triggerJson,
  frequencyCap,
  presentation,
  presetKey,
  selectedProducts,
  presetSelectionId,
}) {
  return JSON.stringify({
    name: (name || '').trim(),
    placementType,
    triggerJson: (triggerJson || '').trim(),
    frequencyCap,
    presentation,
    presetKey: presetKey ?? null,
    productIds: (selectedProducts || []).map((p) => p.id),
    presetSelectionId: presetSelectionId ?? null,
  });
}
