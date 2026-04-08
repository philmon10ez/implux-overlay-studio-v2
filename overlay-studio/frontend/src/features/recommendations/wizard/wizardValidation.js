/**
 * Per-step validation for the recommendation set wizard.
 */

export function validateWizardStep(step, ctx) {
  switch (step) {
    case 1:
      return { ok: true };
    case 2: {
      if (!ctx.name.trim()) {
        return { ok: false, message: 'Add an internal name for this set (only your team sees it).' };
      }
      if (!ctx.isEdit) {
        const mid = parseInt(String(ctx.merchantId), 10);
        if (Number.isNaN(mid) || mid < 1) {
          return { ok: false, message: 'Pick a store so we know which catalog to use.' };
        }
      }
      return { ok: true };
    }
    case 3: {
      if (!ctx.merchantId) {
        return { ok: false, message: 'Select a store on the previous step, then add products.' };
      }
      if (!ctx.selectedProducts.length) {
        return { ok: false, message: 'Choose at least one product — shoppers need something to see.' };
      }
      return { ok: true };
    }
    case 4: {
      if (!ctx.selectedProducts.length) {
        return { ok: false, message: 'Add products in the previous step before editing messaging.' };
      }
      return { ok: true };
    }
    case 5: {
      try {
        const parsed = JSON.parse(ctx.triggerJson.trim() || '{}');
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return { ok: false, message: 'Targeting rules must be a single JSON object (not an array).' };
        }
      } catch {
        return { ok: false, message: 'Fix the JSON syntax in targeting rules — mismatched brackets or quotes.' };
      }
      return { ok: true };
    }
    case 6:
      return { ok: true };
    default:
      return { ok: true };
  }
}
