import { EmptyStateBlock } from './InlineNotice';

export default function SelectedProductsList({ items, onRemove, onMoveUp, onMoveDown }) {
  if (items.length === 0) {
    return (
      <EmptyStateBlock
        emoji="🛒"
        title="Nothing in this set yet"
        description="Add one or more products from your catalog. Order matters: the first item appears first in the carousel on the storefront."
      />
    );
  }

  return (
    <ol className="space-y-2">
      {items.map((p, idx) => (
        <li
          key={p.id}
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
            {idx + 1}
          </span>
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-100">
            {p.imageUrl ? (
              <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">📦</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{p.title}</p>
            {p.sku ? <p className="truncate text-xs text-gray-500">{p.sku}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={idx === 0}
              onClick={() => onMoveUp(idx)}
              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30"
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={idx === items.length - 1}
              onClick={() => onMoveDown(idx)}
              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30"
              aria-label="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="ml-1 rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
