/**
 * Horizontal progress for the recommendation set wizard.
 */
import { REC_WIZARD_STEPS, wizardProgressPercent } from './wizardConstants';

export { REC_WIZARD_STEPS } from './wizardConstants';

export default function WizardStepper({ currentStep }) {
  const total = REC_WIZARD_STEPS.length;
  const pct = wizardProgressPercent(currentStep, total);

  return (
    <nav aria-label="Setup progress" className="mb-8">
      <div className="flex justify-between gap-1 sm:gap-2">
        {REC_WIZARD_STEPS.map((step, i) => {
          const n = i + 1;
          const isDone = currentStep > n;
          const isActive = currentStep === n;

          return (
            <div key={step.title} className="flex min-w-0 flex-1 flex-col items-center">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all sm:h-10 sm:w-10 ${
                  isDone
                    ? 'bg-accent text-white shadow-sm'
                    : isActive
                      ? 'bg-accent/15 text-accent ring-2 ring-accent ring-offset-2 ring-offset-white'
                      : 'bg-gray-100 text-gray-400'
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                {isDone ? (
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  n
                )}
              </div>
              <span
                className={`mt-1.5 hidden text-center text-xs font-semibold leading-tight sm:block ${
                  isActive ? 'text-gray-900' : isDone ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {step.title}
              </span>
              <span className="mt-0.5 hidden text-center text-[10px] text-gray-500 sm:block">{step.subtitle}</span>
              <span
                className={`mt-1.5 text-center text-[10px] font-medium leading-tight sm:hidden ${
                  isActive ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {n}. {step.title}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={total}
        />
      </div>
    </nav>
  );
}
