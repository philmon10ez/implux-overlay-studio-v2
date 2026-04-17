import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import api from '../lib/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';

export default function Analytics() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [overview, setOverview] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [byMerchant, setByMerchant] = useState([]);
  const [topCampaigns, setTopCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.analytics.overview(),
      api.analytics.timeseries({ startDate, endDate }),
      api.analytics.byMerchant(),
      api.analytics.topCampaigns(10),
    ])
      .then(([ov, ts, by, top]) => {
        setOverview(ov);
        setTimeseries(ts.series || []);
        setByMerchant(by.byMerchant || []);
        setTopCampaigns(top.topCampaigns || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  if (loading) return <div className="text-gray-500">Loading...</div>;

  const lineData = timeseries.map((d) => ({
    date: d.date,
    impressions: d.impressions,
    conversions: d.conversions,
  }));

  const barData = byMerchant.map((m) => ({
    name: m.storeName?.slice(0, 12) || m.shopifyDomain?.slice(0, 12) || `Merchant ${m.merchantId}`,
    revenue: Number(m.revenue || 0),
  }));

  const topWithCtr = topCampaigns.map((c) => ({
    ...c,
    ctr: c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(2) + '%' : '0%',
    convRate: c.clicks ? ((c.conversions / c.clicks) * 100).toFixed(2) + '%' : '0%',
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <p className="mt-1 text-gray-500">Campaign performance and revenue</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Impressions" value={overview?.impressions ?? 0} icon="👁" />
        <StatCard title="Clicks" value={overview?.clicks ?? 0} icon="👆" />
        <StatCard title="Conversions" value={overview?.conversions ?? 0} icon="✅" />
        <StatCard
          title="Revenue Attributed"
          value={`$${Number(overview?.revenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          icon="💰"
        />
      </div>

      <div className="mt-8 rounded-lg bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-gray-900">Impressions & Conversions Over Time</h2>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="impressions" stroke="#224BBD" strokeWidth={2} name="Impressions" />
              <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} name="Conversions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8 rounded-lg bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-gray-900">Revenue by Merchant</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#224BBD" name="Revenue" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Top 10 Campaigns (CTR & Conversion Rate)</h2>
        <div className="mt-4">
          <DataTable
            columns={[
              { key: 'name', label: 'Campaign' },
              { key: 'impressions', label: 'Impressions' },
              { key: 'clicks', label: 'Clicks' },
              { key: 'ctr', label: 'CTR' },
              { key: 'conversions', label: 'Conversions' },
              { key: 'convRate', label: 'Conv. Rate' },
              {
                key: 'revenueAttributed',
                label: 'Revenue',
                render: (v) => `$${Number(v || 0).toFixed(2)}`,
              },
            ]}
            data={topWithCtr}
          />
        </div>
      </div>
    </div>
  );
}
