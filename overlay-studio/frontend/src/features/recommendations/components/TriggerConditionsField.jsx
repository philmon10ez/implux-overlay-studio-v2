import { TRIGGER_JSON_PLACEHOLDER } from '../constants';

export default function TriggerConditionsField({ value, onChange, error, syntaxOk = false }) {
  const showValid = syntaxOk && !error && value.trim() !== '';

  return (
    <div>
      <label className="block text-sm font-medium text-gray-800">Targeting rules (JSON)</label>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        For developers: a JSON object your storefront evaluates (cart value, SKUs, tags, etc.). Leave{' '}
        <code className="rounded bg-gray-100 px-1 font-mono text-[11px]">{'{}'}</code> to show this block whenever the
        placement matches — no extra filters.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        spellCheck={false}
        aria-invalid={!!error}
        aria-describedby={error ? 'trigger-json-error' : showValid ? 'trigger-json-valid' : undefined}
        className={`mt-3 w-full rounded-lg border px-3 py-2 font-mono text-sm leading-relaxed transition-colors ${
          error
            ? 'border-red-400 bg-red-50/40 ring-1 ring-red-200/80'
            : showValid
              ? 'border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-200/60 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200'
              : 'border-gray-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
        }`}
        placeholder={TRIGGER_JSON_PLACEHOLDER}
      />
      {error ? (
        <p id="trigger-json-error" className="mt-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {showValid ? (
        <p id="trigger-json-valid" className="mt-2 text-xs font-medium text-emerald-800">
          Valid JSON object — you can save or publish.
        </p>
      ) : null}
      {!error && !showValid ? (
        <p className="mt-2 text-[11px] text-gray-400">
          Invalid JSON or wrong shape can&apos;t be saved — fix errors shown here or use <code className="rounded bg-gray-100 px-1">{'{}'}</code> for no extra rules.
        </p>
      ) : null}
    </div>
  );
}
