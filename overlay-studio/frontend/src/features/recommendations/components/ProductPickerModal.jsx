import { useMemo, useState } from 'react';
import Modal from '../../../components/Modal';
import InlineNotice, { EmptyStateBlock, LoadingBlock } from './InlineNotice';

export default function ProductPickerModal({
  open,
  onClose,
  products,
  selectedIds,
  onAdd,
  loading = false,
  loadError = '',
  onRetryCatalog,
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        (p.sku && p.sku.toLowerCase().includes(needle))
    );
  }, [products, q]);

  return (
    <Modal open={open} title="Add products" onClose={onClose} size="xl">
      {loadError ? (
        <div className="mb-4">
          <InlineNotice
            variant="error"
            title="Couldn’t load catalog"
            action={
              onRetryCatalog ? (
                <button
                  type="button"
                  onClick={onRetryCatalog}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-900 shadow-sm ring-1 ring-red-200 hover:bg-red-50"
                >
                  Retry
                </button>
              ) : null
            }
          >
            {loadError}
          </InlineNotice>
        </div>
      ) : null}

      {loading ? (
        <LoadingBlock label="Loading products" sub="Pulling your store catalog." />
      ) : (
        <>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title or SKU…"
            className="mb-4 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            disabled={!!loadError}
          />
          {filtered.length === 0 ? (
            products.length === 0 && !loadError ? (
              <EmptyStateBlock
                emoji="📦"
                title="No products in this store yet"
                description="Add products to your catalog first, or use Quick-add product on the editor to create one without leaving this flow."
              />
            ) : (
              <EmptyStateBlock
                emoji="🔍"
                title="No matching products"
                description="Try a different search, or clear the box to see everything in your catalog."
              />
            )
          ) : (
            <ul className="max-h-[min(60vh,420px)] divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200">
              {filtered.map((p) => {
                const taken = selectedIds.has(p.id);
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-gray-50/80"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-lg text-gray-400">📦</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">{p.title}</p>
                      <p className="truncate text-xs text-gray-500">
                        {p.sku ? `SKU ${p.sku}` : 'No SKU'}
                        {p.price != null ? ` · $${Number(p.price).toFixed(2)}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={taken}
                      onClick={() => onAdd(p)}
                      className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {taken ? 'Added' : 'Add'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}
