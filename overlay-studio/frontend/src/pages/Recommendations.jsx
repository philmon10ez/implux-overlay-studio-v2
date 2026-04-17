import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';
import InlineNotice from '../features/recommendations/components/InlineNotice';
import { placementLabel } from '../features/recommendations/constants';
import { getPresetLabel } from '../features/recommendations/presets/recommendationPresets';

function SetCard({ row, merchantId, onDelete }) {
  const presetLabel = row.presetKey ? getPresetLabel(row.presetKey) : null;
  return (
    <article className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-card transition-colors hover:border-poptek-action/25">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">{row.name}</h2>
          {presetLabel ? (
            <p className="mt-1 text-[11px] font-medium text-violet-600">Preset: {presetLabel}</p>
          ) : null}
        </div>
        <StatusBadge status={row.status} />
      </div>
      <p className="mt-2 text-sm text-gray-500">
        <span className="font-medium text-gray-700">{placementLabel(row.placementType)}</span>
        <span className="mx-1.5 text-gray-300">·</span>
        {row.productCount ?? 0} product{(row.productCount ?? 0) === 1 ? '' : 's'}
      </p>
      <p className="mt-3 text-xs text-gray-400">
        Updated {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '—'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
        <Link
          to={`/recommendations/${row.id}/edit?merchantId=${merchantId}&step=2`}
          className="rounded-lg bg-poptek-action px-3 py-1.5 text-sm font-medium text-white hover:bg-poptek-action/90"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={() => onDelete(row)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-200/80" />
      ))}
    </div>
  );
}

export default function Recommendations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const merchantId = searchParams.get('merchantId') || '';

  const [merchants, setMerchants] = useState([]);
  const [merchantsLoading, setMerchantsLoading] = useState(true);
  const [merchantsLoadError, setMerchantsLoadError] = useState('');
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modal, setModal] = useState(null);

  const loadSets = useCallback(() => {
    if (!merchantId) {
      setSets([]);
      setLoading(false);
      setLoadError('');
      return;
    }
    setLoading(true);
    setLoadError('');
    api.recommendationSets
      .list(merchantId)
      .then((r) => setSets(r.recommendationSets || []))
      .catch((e) => {
        setSets([]);
        setLoadError(e.body?.error || e.message || 'Could not load recommendation sets.');
      })
      .finally(() => setLoading(false));
  }, [merchantId]);

  useEffect(() => {
    setMerchantsLoadError('');
    setMerchantsLoading(true);
    api.merchants
      .list()
      .then((r) => setMerchants(r.merchants || []))
      .catch((e) => setMerchantsLoadError(e.body?.error || e.message || 'Could not load stores.'))
      .finally(() => setMerchantsLoading(false));
  }, []);

  useEffect(() => {
    loadSets();
  }, [loadSets]);

  useEffect(() => {
    if (!merchantId && merchants.length === 1) {
      setSearchParams({ merchantId: String(merchants[0].id) }, { replace: true });
    }
  }, [merchantId, merchants, setSearchParams]);

  const setMerchantFilter = (id) => {
    if (id) setSearchParams({ merchantId: id });
    else setSearchParams({});
  };

  const deleteSet = (row) => {
    setModal({
      title: 'Delete recommendation set',
      message: `Remove “${row.name}”? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      deleteError: '',
      onConfirm: () => {
        setModal((m) => (m ? { ...m, deleteError: '' } : m));
        api.recommendationSets
          .delete(row.id)
          .then(() => {
            setModal(null);
            loadSets();
          })
          .catch((e) => {
            const msg = e.body?.error || e.message || 'Delete failed.';
            setModal((m) => (m ? { ...m, deleteError: msg } : m));
          });
      },
      onCancel: () => setModal(null),
    });
  };

  const newHref = merchantId
    ? `/recommendations/new?merchantId=${merchantId}&step=1`
    : '/recommendations/new?step=1';

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recommendations</h1>
          <p className="mt-1 text-gray-500">Curate product sets for product pages, cart, and checkout</p>
        </div>
        <Link
          to={newHref}
          className={`inline-flex justify-center rounded-lg px-4 py-2 text-sm font-medium text-white ${
            merchantId ? 'bg-poptek-action hover:bg-poptek-action/90' : 'cursor-not-allowed bg-gray-300'
          }`}
          onClick={(e) => {
            if (!merchantId) e.preventDefault();
          }}
        >
          New recommendation set
        </Link>
      </div>

      {merchantsLoadError ? (
        <div className="mt-6">
          <InlineNotice
            variant="error"
            title="Couldn’t load stores"
            action={
              <button
                type="button"
                onClick={() => {
                  setMerchantsLoadError('');
                  api.merchants
                    .list()
                    .then((r) => setMerchants(r.merchants || []))
                    .catch((e) => setMerchantsLoadError(e.body?.error || e.message || 'Request failed'));
                }}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-900 shadow-sm ring-1 ring-red-200 hover:bg-red-50"
              >
                Retry
              </button>
            }
          >
            {merchantsLoadError}
          </InlineNotice>
        </div>
      ) : null}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-card sm:p-5">
        <p className="text-sm font-semibold text-gray-900">Which store?</p>
        <p className="mt-1 text-sm text-gray-500">Recommendation sets are per shop — pick a store to see and edit its sets.</p>
        <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-gray-500">Store</label>
        <select
          value={merchantId}
          onChange={(e) => setMerchantFilter(e.target.value)}
          disabled={!!merchantsLoadError && merchants.length === 0}
          className="mt-2 max-w-md rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-poptek-action focus:outline-none focus:ring-2 focus:ring-poptek-action/20 disabled:cursor-not-allowed disabled:bg-gray-50"
        >
          <option value="">{merchants.length === 0 ? 'No stores available' : 'Select a merchant…'}</option>
          {merchants.map((m) => (
            <option key={m.id} value={m.id}>
              {m.storeName}
            </option>
          ))}
        </select>
        {!merchantId && merchants.length > 0 ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-100">
            Select a store to load your recommendation sets.
          </p>
        ) : null}
        {!merchantsLoading && !merchantsLoadError && merchants.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            No merchants connected yet. Add a store in your merchant settings, then refresh this page.
          </p>
        ) : null}
      </div>

      {loadError ? (
        <div className="mt-6">
          <InlineNotice
            variant="error"
            title="Couldn’t load recommendation sets"
            action={
              <button
                type="button"
                onClick={loadSets}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-900 shadow-sm ring-1 ring-red-200 hover:bg-red-50"
              >
                Retry
              </button>
            }
          >
            {loadError}
          </InlineNotice>
        </div>
      ) : null}

      {!merchantId ? null : loading ? (
        <div className="mt-8">
          <ListSkeleton />
        </div>
      ) : sets.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gradient-to-b from-white to-gray-50/80 px-6 py-16 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-poptek-action/10 text-2xl">✨</div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">No recommendation sets yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Build your first set: pick a placement, attach products, and define optional trigger rules. You can save as
            draft or publish when ready.
          </p>
          <Link
            to={newHref}
            className="mt-6 inline-flex rounded-lg bg-poptek-action px-5 py-2.5 text-sm font-medium text-white hover:bg-poptek-action/90"
          >
            Create recommendation set
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sets.map((row) => (
            <SetCard key={row.id} row={row} merchantId={merchantId} onDelete={deleteSet} />
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!modal}
        title={modal?.title}
        message={modal?.message}
        confirmLabel={modal?.confirmLabel}
        danger={modal?.danger}
        onConfirm={modal?.onConfirm}
        onCancel={modal?.onCancel}
        error={modal?.deleteError}
      />
    </div>
  );
}
