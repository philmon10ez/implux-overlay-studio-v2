export default function StatCard({ title, value, sub, icon }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          {sub != null && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        {icon && <span className="text-2xl opacity-80">{icon}</span>}
      </div>
    </div>
  );
}
