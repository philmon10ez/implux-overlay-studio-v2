import { describe, it, expect } from 'vitest';
import { REC_WIZARD_STEPS, REC_WIZARD_STEP_COUNT, wizardProgressPercent } from './wizardConstants';

describe('wizardConstants', () => {
  it('has six steps with titles', () => {
    expect(REC_WIZARD_STEP_COUNT).toBe(6);
    expect(REC_WIZARD_STEPS[0].title).toBe('Preset');
    expect(REC_WIZARD_STEPS[5].title).toBe('Publish');
  });

  it('wizardProgressPercent matches stepper formula', () => {
    expect(wizardProgressPercent(1, 6)).toBe(0);
    expect(wizardProgressPercent(6, 6)).toBe(100);
    expect(wizardProgressPercent(3, 6)).toBe(40);
    expect(wizardProgressPercent(1, 1)).toBe(100);
  });
});
