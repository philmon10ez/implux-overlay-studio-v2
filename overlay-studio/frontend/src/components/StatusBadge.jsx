const styles = {
  active: 'bg-emerald-100 text-emerald-800',
  paused: 'bg-amber-100 text-amber-800',
  draft: 'bg-gray-100 text-gray-600',
};

export default function StatusBadge({ status }) {
  const s = (status || 'draft').toLowerCase();
  const cls = styles[s] || styles.draft;
  const label = s === 'active' ? 'Active' : s === 'paused' ? 'Paused' : 'Draft';
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}
