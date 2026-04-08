import { describe, it, expect, vi } from 'vitest';
import { applyRecommendationAssistantPatch, applyAddProductIds } from './applyRecommendationAssistantPatch';

describe('applyRecommendationAssistantPatch', () => {
  it('returns error for non-object patch', () => {
    const r = applyRecommendationAssistantPatch(null, {});
    expect(r.applied).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('applies placement and presentation', () => {
    const setPlacementType = vi.fn();
    const setPresentation = vi.fn((updater) => updater({ headline: '', subcopy: '', ctaLabel: '' }));
    const setFrequencyCap = vi.fn();
    const setTriggerJson = vi.fn();
    const r = applyRecommendationAssistantPatch(
      {
        placementType: 'cart',
        presentation: { headline: 'Hi' },
      },
      { setPlacementType, setPresentation, setFrequencyCap, setTriggerJson }
    );
    expect(r.applied).toBe(true);
    expect(setPlacementType).toHaveBeenCalledWith('cart');
    expect(setPresentation).toHaveBeenCalled();
  });

  it('rejects invalid trigger JSON string', () => {
    const setters = {
      setPlacementType: vi.fn(),
      setPresentation: vi.fn(),
      setFrequencyCap: vi.fn(),
      setTriggerJson: vi.fn(),
    };
    const r = applyRecommendationAssistantPatch({ triggerJson: 'not json' }, setters);
    expect(r.applied).toBe(false);
    expect(r.errors.some((e) => /invalid/i.test(e))).toBe(true);
  });
});

describe('applyAddProductIds', () => {
  it('adds catalog matches and skips duplicates', () => {
    const selected = new Set([1]);
    const addProduct = vi.fn();
    const out = applyAddProductIds([1, 2, 99], [{ id: 2, title: 'B' }], selected, addProduct);
    expect(out.added).toBe(1);
    expect(out.skipped).toBe(2);
    expect(addProduct).toHaveBeenCalledTimes(1);
  });
});
