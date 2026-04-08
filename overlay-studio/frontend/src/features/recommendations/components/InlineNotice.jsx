/**
 * Consistent inline alerts for recommendation flows (list, editor, modals, assistant).
 */
const icons = {
  info: (
    <svg className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  error: (
    <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  neutral: (
    <svg className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
    </svg>
  ),
};

const shell = {
  info: 'border-sky-200/90 bg-gradient-to-br from-sky-50 to-white text-sky-950',
  success: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-white text-emerald-900',
  warning: 'border-amber-200/90 bg-gradient-to-br from-amber-50 to-white text-amber-950',
  error: 'border-red-200/90 bg-gradient-to-br from-red-50 to-white text-red-900',
  neutral: 'border-gray-200 bg-gray-50/90 text-gray-800',
};

export default function InlineNotice({
  variant = 'info',
  title,
  children,
  className = '',
  action,
  icon,
  dense = false,
}) {
  const Icon = icon ?? icons[variant] ?? icons.info;
  return (
    <div
      className={`rounded-xl border shadow-sm ${shell[variant] ?? shell.neutral} ${dense ? 'px-3 py-2.5 text-xs' : 'px-4 py-3 text-sm'} leading-relaxed ${className}`}
      role={variant === 'error' ? 'alert' : undefined}
    >
      <div className="flex gap-3">
        {Icon}
        <div className="min-w-0 flex-1">
          {title ? <p className={`font-semibold ${dense ? 'text-xs' : 'text-sm'}`}>{title}</p> : null}
          <div className={title ? 'mt-0.5' : ''}>{children}</div>
          {action ? <div className="mt-2 flex flex-wrap gap-2">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

/** Centered loading block for modals and panels */
export function LoadingBlock({ label = 'Loading…', sub }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-6 py-10">
      <span
        className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-accent"
        aria-hidden
      />
      <div className="text-center">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {sub ? <p className="mt-1 text-xs text-gray-500">{sub}</p> : null}
      </div>
    </div>
  );
}

/** Empty illustration block for lists / modals */
export function EmptyStateBlock({ emoji = '📭', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-5 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-gray-100" aria-hidden>
        {emoji}
      </span>
      <p className="mt-3 text-sm font-semibold text-gray-900">{title}</p>
      {description ? <p className="mt-2 max-w-sm text-xs leading-relaxed text-gray-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
