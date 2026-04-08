import { describe, it, expect } from 'vitest';
import { fingerprintRecommendationForm } from './recommendationSetFingerprint';

describe('fingerprintRecommendationForm', () => {
  it('changes when product order or fields change', () => {
    const a = fingerprintRecommendationForm({
      name: 'A',
      placementType: 'cart',
      triggerJson: '{}',
      frequencyCap: {},
      presentation: {},
      presetKey: null,
      selectedProducts: [{ id: 1 }],
      presetSelectionId: 'x',
    });
    const b = fingerprintRecommendationForm({
      name: 'A',
      placementType: 'cart',
      triggerJson: '{}',
      frequencyCap: {},
      presentation: {},
      presetKey: null,
      selectedProducts: [{ id: 2 }],
      presetSelectionId: 'x',
    });
    expect(a).not.toBe(b);
  });

  it('stable for auto-save / dirty detection when inputs equal', () => {
    const ctx = {
      name: ' Same ',
      placementType: 'product_page',
      triggerJson: ' {} ',
      frequencyCap: { x: 1 },
      presentation: { h: 1 },
      presetKey: null,
      selectedProducts: [{ id: 1 }],
      presetSelectionId: null,
    };
    expect(fingerprintRecommendationForm(ctx)).toBe(fingerprintRecommendationForm(ctx));
  });
});
