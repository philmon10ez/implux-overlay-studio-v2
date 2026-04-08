/**
 * Shared frequency capping UI for campaigns and recommendation sets.
 */
export default function FrequencyCapFields({ value, onChange, idPrefix = 'fc' }) {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor={`${idPrefix}-type`} className="block text-sm font-medium text-gray-800">
          How often can this appear?
        </label>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Keeps the experience from feeling repetitive. Limits apply per visitor in this browser (session + anonymous id).
        </p>
        <select
          id={`${idPrefix}-type`}
          value={value.frequency_cap_type}
          onChange={(e) => set({ frequency_cap_type: e.target.value })}
          className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        >
          <option value="none">No limit — show whenever triggers match</option>
          <option value="standard">Limit impressions (recommended for most campaigns)</option>
        </select>
      </div>
      {value.frequency_cap_type === 'standard' ? (
        <div className="grid gap-4 rounded-xl border border-gray-100 bg-white/80 p-4 sm:grid-cols-2 sm:p-5">
          <div>
            <label htmlFor={`${idPrefix}-sess`} className="block text-sm font-medium text-gray-700">
              Max times per visit
            </label>
            <p className="mt-0.5 text-[11px] text-gray-500">Per browser tab session.</p>
            <input
              id={`${idPrefix}-sess`}
              type="number"
              min={1}
              step={1}
              placeholder="Unlimited"
              value={value.max_impressions_per_session}
              onChange={(e) => set({ max_impressions_per_session: e.target.value })}
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-day`} className="block text-sm font-medium text-gray-700">
              Max times per day
            </label>
            <p className="mt-0.5 text-[11px] text-gray-500">Resets at midnight UTC.</p>
            <input
              id={`${idPrefix}-day`}
              type="number"
              min={1}
              step={1}
              placeholder="Unlimited"
              value={value.max_impressions_per_day}
              onChange={(e) => set({ max_impressions_per_day: e.target.value })}
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-cool`} className="block text-sm font-medium text-gray-700">
              Wait time between shows
            </label>
            <p className="mt-0.5 text-[11px] text-gray-500">Minutes between impressions.</p>
            <input
              id={`${idPrefix}-cool`}
              type="number"
              min={1}
              step={1}
              placeholder="None"
              value={value.cooldown_minutes}
              onChange={(e) => set({ cooldown_minutes: e.target.value })}
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-life`} className="block text-sm font-medium text-gray-700">
              Max lifetime impressions
            </label>
            <p className="mt-0.5 text-[11px] text-gray-500">Optional “only show once” on this device.</p>
            <input
              id={`${idPrefix}-life`}
              type="number"
              min={1}
              step={1}
              placeholder="Unlimited"
              value={value.max_impressions_lifetime}
              onChange={(e) => set({ max_impressions_lifetime: e.target.value })}
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
