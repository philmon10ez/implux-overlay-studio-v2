/**
 * Grouped panel — optional collapse for progressive disclosure.
 */
import { useState } from 'react';

export default function SectionCard({
  title,
  description,
  children,
  collapsible = false,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!collapsible) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white shadow-card">
        <header className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
        </header>
        <div className="px-5 py-4">{children}</div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50/90"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
        </div>
        <span className="shrink-0 text-xs text-gray-400" aria-hidden>
          {open ? '▼' : '▶'}
        </span>
      </button>
      {open ? <div className="border-t border-gray-100 px-5 py-4">{children}</div> : null}
    </section>
  );
}
