/**
 * Wizard step definitions and progress math — tested independently of React.
 */
export const REC_WIZARD_STEPS = [
  { title: 'Preset', subtitle: 'Start smart' },
  { title: 'Placement', subtitle: 'Where it runs' },
  { title: 'Products', subtitle: 'What to show' },
  { title: 'Design', subtitle: 'Copy & preview' },
  { title: 'Rules', subtitle: 'Targeting & caps' },
  { title: 'Publish', subtitle: 'Review & go live' },
];

export const REC_WIZARD_STEP_COUNT = REC_WIZARD_STEPS.length;

/**
 * Matches WizardStepper progress bar width (0–100).
 * @param {number} currentStep — 1-based
 * @param {number} [totalSteps]
 */
export function wizardProgressPercent(currentStep, totalSteps = REC_WIZARD_STEP_COUNT) {
  const total = totalSteps;
  if (total <= 1) return 100;
  const clamped = Math.min(Math.max(currentStep, 1), total);
  return ((clamped - 1) / (total - 1)) * 100;
}
