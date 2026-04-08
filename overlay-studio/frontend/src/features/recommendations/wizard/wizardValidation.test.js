import { describe, it, expect } from 'vitest';
import { validateWizardStep } from './wizardValidation';

describe('validateWizardStep', () => {
  const base = {
    isEdit: false,
    merchantId: '1',
    name: 'My set',
    selectedProducts: [{ id: 1 }],
    triggerJson: '{}',
  };

  it('step 1 always ok', () => {
    expect(validateWizardStep(1, base).ok).toBe(true);
  });

  it('step 2 requires name and merchant for new sets', () => {
    expect(validateWizardStep(2, { ...base, name: '  ' }).ok).toBe(false);
    expect(validateWizardStep(2, { ...base, isEdit: true, name: 'X', merchantId: '' }).ok).toBe(true);
    expect(validateWizardStep(2, { ...base, name: 'X', merchantId: '' }).ok).toBe(false);
  });

  it('step 3 requires products', () => {
    expect(validateWizardStep(3, { ...base, selectedProducts: [] }).ok).toBe(false);
    expect(validateWizardStep(3, { ...base, merchantId: '', selectedProducts: [] }).ok).toBe(false);
  });

  it('step 5 rejects invalid JSON', () => {
    expect(validateWizardStep(5, { ...base, triggerJson: '{' }).ok).toBe(false);
    expect(validateWizardStep(5, { ...base, triggerJson: '[]' }).ok).toBe(false);
    expect(validateWizardStep(5, { ...base, triggerJson: '{}' }).ok).toBe(true);
  });
});
