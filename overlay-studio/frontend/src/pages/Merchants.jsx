import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';

export default function Merchants() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    storeName: '',
    shopifyDomain: '',
    accessToken: '',
    rakutenMid: '',
    status: 'active',
  });

  const load = () => {
    api.merchants
      .list()
      .then((r) => setList(r.merchants || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setForm({ storeName: '', shopifyDomain: '', accessToken: '', rakutenMid: '', status: 'active' });
    setEditId(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      storeName: row.storeName,
      shopifyDomain: row.shopifyDomain,
      accessToken: row.accessToken || '••••••••',
      rakutenMid: row.rakutenMid || '',
      status: row.status || 'active',
    });
    setEditId(row.id);
    setFormOpen(true);
  };

  const save = () => {
    const payload = {
      storeName: form.storeName,
      shopifyDomain: form.shopifyDomain,
      accessToken: form.accessToken,
      rakutenMid: form.rakutenMid || undefined,
      status: form.status,
    };
    if (editId) {
      if (payload.accessToken === '••••••••') delete payload.accessToken;
      api.merchants
        .update(editId, payload)
        .then(() => {
          setFormOpen(false);
          load();
        })
        .catch((e) => alert(e.body?.error || e.message));
    } else {
      api.merchants
        .create(payload)
        .then(() => {
          setFormOpen(false);
          load();
        })
        .catch((e) => alert(e.body?.error || e.message));
    }
  };

  const deleteRow = (row) => {
    setModal({
      title: 'Delete Merchant',
      message: `Remove "${row.storeName}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => {
        api.merchants
          .delete(row.id)
          .then(() => {
            setModal(null);
            load();
          })
          .catch((e) => alert(e.body?.error || e.message));
      },
      onCancel: () => setModal(null),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Merchants</h1>
        <button
          type="button"
          onClick={openAdd}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          Add Merchant
        </button>
      </div>
      <p className="mt-1 text-gray-500">Manage Shopify stores connected to Implux</p>

      {loading ? (
        <div className="mt-6 text-gray-500">Loading...</div>
      ) : (
        <div className="mt-6">
          <DataTable
            columns={[
              { key: 'storeName', label: 'Store Name' },
              { key: 'shopifyDomain', label: 'Shopify Domain' },
              { key: 'rakutenMid', label: 'Rakuten MID', render: (v) => v || '—' },
              { key: 'status', label: 'Status', render: (_, row) => <StatusBadge status={row.status} /> },
            ]}
            data={list}
            actions={(row) => (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="text-accent hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteRow(row)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            )}
          />
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{editId ? 'Edit Merchant' : 'Add Merchant'}</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Store Name</label>
                <input
                  value={form.storeName}
                  onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Shopify Domain</label>
                <input
                  value={form.shopifyDomain}
                  onChange={(e) => setForm((f) => ({ ...f, shopifyDomain: e.target.value }))}
                  placeholder="store.myshopify.com"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Access Token</label>
                <input
                  type="password"
                  value={form.accessToken}
                  onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
                  placeholder={editId ? 'Leave blank to keep current' : ''}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rakuten MID</label>
                <input
                  value={form.rakutenMid}
                  onChange={(e) => setForm((f) => ({ ...f, rakutenMid: e.target.value }))}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
              >
                Save
              </button>
            </div>
          </div>
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
      />
    </div>
  );
}
