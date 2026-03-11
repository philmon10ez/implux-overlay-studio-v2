import { useState } from 'react';

export default function DataTable({ columns, data, keyField = 'id', onSort, sortKey, sortDir, actions }) {
  const [localSort, setLocalSort] = useState({ key: null, dir: 'asc' });
  const key = sortKey ?? localSort.key;
  const dir = sortDir ?? localSort.dir;

  const handleSort = (colKey) => {
    if (onSort) {
      onSort(colKey, dir === 'asc' ? 'desc' : 'asc');
      return;
    }
    setLocalSort((s) => ({ key: colKey, dir: s.key === colKey && s.dir === 'asc' ? 'desc' : 'asc' }));
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-card">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                {col.sortable !== false ? (
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    {col.label}
                    {key === col.key && <span>{dir === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
            {actions && <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data.map((row) => (
            <tr key={row[keyField]} className="hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
              {actions && (
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">{actions(row)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
