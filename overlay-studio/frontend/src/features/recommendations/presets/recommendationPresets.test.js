import { describe, it, expect, vi } from 'vitest';
import { applyRecommendationPreset, RECOMMENDATION_PRESETS, SCRATCH_ID, getPresetLabel } from './recommendationPresets';

describe('recommendationPresets', () => {
  it('getPresetLabel resolves known keys', () => {
    expect(getPresetLabel('high_conversion_upsell')).toMatch(/upsell/i);
    expect(getPresetLabel('unknown')).toBe('unknown');
  });

  it('applyRecommendationPreset sets state from a known preset', () => {
    const setPlacementType = vi.fn();
    const setName = vi.fn();
    const setTriggerJson = vi.fn();
    const setFrequencyCap = vi.fn();
    const setPresentation = vi.fn();
    const setPresetKey = vi.fn();
    applyRecommendationPreset(
      'cart_booster',
      {
        setPlacementType,
        setName,
        setTriggerJson,
        setFrequencyCap,
        setPresentation,
        setPresetKey,
      },
      {}
    );
    expect(setPresetKey).toHaveBeenCalledWith('cart_booster');
    expect(setPlacementType).toHaveBeenCalledWith('cart');
    expect(setTriggerJson).toHaveBeenCalled();
    expect(setPresentation).toHaveBeenCalled();
  });

  it('applyRecommendationPreset scratch clears preset key', () => {
    const setters = {
      setPlacementType: vi.fn(),
      setName: vi.fn(),
      setTriggerJson: vi.fn(),
      setFrequencyCap: vi.fn(),
      setPresentation: vi.fn(),
      setPresetKey: vi.fn(),
    };
    applyRecommendationPreset(SCRATCH_ID, setters);
    expect(setters.setPresetKey).toHaveBeenCalledWith(null);
  });

  it('preset definitions stay aligned with backend keys', () => {
    const ids = Object.keys(RECOMMENDATION_PRESETS);
    expect(ids.sort()).toEqual(['cart_booster', 'checkout_addon', 'high_conversion_upsell'].sort());
  });
});
