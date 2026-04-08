/** Quick intents sent to the recommendation assistant API */
export const RECOMMENDATION_ASSISTANT_INTENTS = [
  {
    id: 'products',
    label: 'Best products',
    hint: 'What to recommend',
    intent: 'products',
  },
  {
    id: 'placement',
    label: 'Placement',
    hint: 'Where to show',
    intent: 'placement',
  },
  {
    id: 'cta',
    label: 'CTA & copy',
    hint: 'Button & text',
    intent: 'cta',
  },
  {
    id: 'frequency',
    label: 'Frequency',
    hint: 'Caps & cooldown',
    intent: 'frequency',
  },
  {
    id: 'rules',
    label: 'Rules',
    hint: 'Trigger targeting',
    intent: 'rules',
  },
  {
    id: 'optimize',
    label: 'Optimize',
    hint: 'Full pass',
    intent: 'optimize',
  },
];

export const CATEGORY_LABELS = {
  placement: 'Placement',
  copy: 'Copy & CTA',
  frequency: 'Frequency',
  products: 'Products',
  rules: 'Rules',
  general: 'General',
};
