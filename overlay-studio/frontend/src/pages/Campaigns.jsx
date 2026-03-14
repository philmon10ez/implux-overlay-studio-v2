import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ merchantId: '', type: '', status: '' });
  const [modal, setModal] = useState(null);

  const load = () => {
    setLoading(true);
    const params = {};
    if (filter.merchantId) params.merchantId = filter.merchantId;
    api.campaigns
      .list(params)
      .then((r) => setCampaigns(r.campaigns || []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filter.merchantId]);

  useEffect(() => {
    api.merchants.list().then((r) => setMerchants(r.merchants || [])).catch(() => {});
  }, []);

  const filtered =
    campaigns.filter((c) => {
      if (filter.type && c.type !== filter.type) return false;
      if (filter.status && c.status !== filter.status) return false;
      return true;
    });

  const toggleStatus = (row) => {
    const next = row.status === 'active' ? 'paused' : 'active';
    api.campaigns
      .update(row.id, { status: next })
      .then(load)
      .catch((e) => alert(e.body?.error || e.message));
  };

  const duplicate = (row) => {
    api.campaigns
      .duplicate(row.id)
      .then(load)
      .catch((e) => alert(e.body?.error || e.message));
  };

  const deleteCampaign = (row) => {
    setModal({
      title: 'Delete Campaign',
      message: `Delete "${row.name}"?`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => {
        api.campaigns
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
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <Link
          to="/campaigns/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          New Campaign
        </Link>
      </div>
      <p className="mt-1 text-gray-500">Create and manage overlay campaigns</p>

      <div className="mt-6 flex flex-wrap gap-4 rounded-lg bg-white p-4 shadow-card">
        <div>
          <label className="block text-xs font-medium text-gray-500">Merchant</label>
          <select
            value={filter.merchantId}
            onChange={(e) => setFilter((f) => ({ ...f, merchantId: e.target.value }))}
            className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.storeName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Type</label>
          <select
            value={filter.type}
            onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
            className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="exit_intent">Exit Intent</option>
            <option value="time_delay">Time Delay</option>
            <option value="scroll_depth">Scroll Depth</option>
            <option value="welcome_mat">Welcome Mat</option>
            <option value="promo_banner">Promo Banner</option>
            <option value="sticky_footer">Sticky Footer</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Status</label>
          <select
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
            className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 text-gray-500">Loading...</div>
      ) : (
        <div className="mt-6">
          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'type', label: 'Type' },
              { key: 'status', label: 'Status', render: (_, row) => <StatusBadge status={row.status} /> },
              { key: 'impressions', label: 'Impressions' },
              { key: 'clicks', label: 'Clicks' },
              { key: 'conversions', label: 'Conversions' },
              {
                key: 'revenueAttributed',
                label: 'Revenue',
                render: (v) => `$${Number(v || 0).toFixed(2)}`,
              },
            ]}
            data={filtered}
            actions={(row) => (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => toggleStatus(row)}
                  className="text-accent hover:underline"
                >
                  {row.status === 'active' ? 'Pause' : 'Activate'}
                </button>
                <Link to={`/campaigns/${row.id}/edit`} className="text-accent hover:underline">
                  Edit
                </Link>
                <button type="button" onClick={() => duplicate(row)} className="text-gray-600 hover:underline">
                  Duplicate
                </button>
                <button type="button" onClick={() => deleteCampaign(row)} className="text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            )}
          />
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
