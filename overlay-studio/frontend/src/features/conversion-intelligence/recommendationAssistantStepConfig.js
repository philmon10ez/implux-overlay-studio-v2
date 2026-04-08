import { PLACEMENT_OPTIONS } from '../recommendations/constants';

/**
 * Which quick intents to surface first per wizard step (rest available under "All topics").
 */
export const STEP_INTENT_PRIORITY = {
  2: ['placement', 'cta', 'optimize'],
  3: ['products', 'placement', 'optimize'],
  4: ['cta', 'products', 'optimize'],
  5: ['frequency', 'rules', 'optimize'],
  6: ['optimize', 'placement', 'cta'],
};

export function stepAssistantSubtitle(step) {
  switch (step) {
    case 2:
      return 'Tip: ask about placement and store context — preview updates as you apply.';
    case 3:
      return 'Tip: product and placement ideas work best after you pick a store.';
    case 4:
      return 'Tip: copy suggestions merge into headline, supporting line, and button label.';
    case 5:
      return 'Tip: frequency and rules suggestions apply only when you click Apply.';
    case 6:
      return 'Tip: final review — run a full optimize pass or tweak one area.';
    default:
      return '';
  }
}

export function placementLabelForApply(value) {
  return PLACEMENT_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
