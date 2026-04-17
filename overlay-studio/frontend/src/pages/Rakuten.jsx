import { useState, useEffect } from 'react';
import api from '../lib/api';
import DataTable from '../components/DataTable';

export default function Rakuten() {
  const [creds, setCreds] = useState(null);
  const [form, setForm] = useState({ clientId: '', clientSecret: '', publisherId: '', securityToken: '' });
  const [connected, setConnected] = useState(false);
  const [testing, setTesting] = useState(false);
  const [tab, setTab] = useState('advertisers');
  const [advertisers, setAdvertisers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [txStart, setTxStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [txEnd, setTxEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [syncLog, setSyncLog] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.rakuten
      .credentials()
      .then((r) => {
        setCreds(r.credentials);
        setConnected(!!r.credentials);
      })
      .catch(() => setCreds(null))
      .finally(() => setLoading(false));
  }, []);

  const connect = () => {
    setTesting(true);
    api.rakuten
      .connect(form)
      .then(() => {
        setConnected(true);
        setSyncLog('Connection successful.');
        return api.rakuten.credentials();
      })
      .then((r) => setCreds(r.credentials))
      .catch((e) => setSyncLog(e.body?.error || e.message || 'Connection failed'))
      .finally(() => setTesting(false));
  };

  useEffect(() => {
    if (!connected || tab !== 'advertisers') return;
    api.rakuten
      .advertisers()
      .then((r) => setAdvertisers(Array.isArray(r.advertisers) ? r.advertisers : []))
      .catch(() => setAdvertisers([]));
  }, [connected, tab]);

  useEffect(() => {
    if (!connected || tab !== 'transactions') return;
    api.rakuten
      .transactions({ startDate: txStart, endDate: txEnd })
      .then((r) => setTransactions(r.transactions || []))
      .catch(() => setTransactions([]));
  }, [connected, tab, txStart, txEnd]);

  const runSync = () => {
    setSyncLog('Syncing...');
    api.rakuten
      .sync()
      .then(() => {
        setLastSync(new Date().toISOString());
        setSyncLog('Sync completed.');
      })
      .catch((e) => setSyncLog(e.body?.error || e.message || 'Sync failed'));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Rakuten Advertising</h1>
      <p className="mt-1 text-gray-500">Connect and sync with Rakuten Advertising API</p>

      <div className="mt-6 rounded-lg bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Credentials</h2>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              connected ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {connected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Client ID</label>
            <input
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
              placeholder={creds?.clientId || '••••••••'}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Client Secret</label>
            <input
              type="password"
              value={form.clientSecret}
              onChange={(e) => setForm((f) => ({ ...f, clientSecret: e.target.value }))}
              placeholder="••••••••"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Publisher ID</label>
            <input
              value={form.publisherId}
              onChange={(e) => setForm((f) => ({ ...f, publisherId: e.target.value }))}
              placeholder={creds?.publisherId || ''}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Security Token</label>
            <input
              type="password"
              value={form.securityToken}
              onChange={(e) => setForm((f) => ({ ...f, securityToken: e.target.value }))}
              placeholder="••••••••"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={connect}
          disabled={testing}
          className="mt-4 rounded-lg bg-poptek-action px-4 py-2 text-sm font-medium text-white hover:bg-poptek-action/90 disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Connect & Test'}
        </button>
      </div>

      {connected && (
        <div className="mt-8">
          <div className="flex gap-2 border-b border-gray-200">
            {['advertisers', 'transactions', 'sync'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`border-b-2 px-4 py-2 text-sm font-medium capitalize ${
                  tab === t ? 'border-poptek-action text-poptek-action' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'advertisers' && (
            <div className="mt-4 rounded-lg bg-white p-4 shadow-card">
              <h3 className="font-medium">Advertisers</h3>
              {advertisers.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">No advertisers or API returned different structure.</p>
              ) : (
                <DataTable
                  columns={[
                    { key: 'mid', label: 'MID' },
                    { key: 'name', label: 'Name' },
                    { key: 'category', label: 'Category', render: (v) => v || '—' },
                    { key: 'status', label: 'Status', render: (v) => v || '—' },
                  ]}
                  data={advertisers}
                />
              )}
            </div>
          )}

          {tab === 'transactions' && (
            <div className="mt-4 rounded-lg bg-white p-4 shadow-card">
              <div className="mb-4 flex gap-2">
                <input
                  type="date"
                  value={txStart}
                  onChange={(e) => setTxStart(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={txEnd}
                  onChange={(e) => setTxEnd(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <DataTable
                columns={[
                  { key: 'orderId', label: 'Order ID', render: (_, row) => row.orderId ?? row.order_id ?? '—' },
                  { key: 'mid', label: 'MID', render: (_, row) => row.mid ?? '—' },
                  { key: 'saleAmount', label: 'Sale', render: (_, row) => { const v = row.saleAmount ?? row.sale_amount; return v != null ? `$${Number(v).toFixed(2)}` : '—'; } },
                  { key: 'commissionAmount', label: 'Commission', render: (_, row) => { const v = row.commissionAmount ?? row.commission_amount; return v != null ? `$${Number(v).toFixed(2)}` : '—'; } },
                  { key: 'transactionDate', label: 'Date', render: (_, row) => { const v = row.transactionDate ?? row.transaction_date; return v ? new Date(v).toLocaleDateString() : '—'; } },
                  { key: 'status', label: 'Status', render: (_, row) => row.status ?? '—' },
                ]}
                data={transactions}
              />
            </div>
          )}

          {tab === 'sync' && (
            <div className="mt-4 rounded-lg bg-white p-4 shadow-card">
              <p className="text-sm text-gray-500">Last sync: {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}</p>
              <button
                type="button"
                onClick={runSync}
                className="mt-2 rounded-lg bg-poptek-action px-4 py-2 text-sm font-medium text-white hover:bg-poptek-action/90"
              >
                Run Manual Sync
              </button>
              {syncLog && <pre className="mt-4 rounded bg-gray-100 p-3 text-sm">{syncLog}</pre>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
