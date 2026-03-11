import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.analytics.overview(), api.campaigns.list()])
      .then(([ov, list]) => {
        setOverview(ov);
        const all = list.campaigns || [];
        setAllCampaigns(all);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading...</div>;

  const recentCampaigns = allCampaigns.slice(0, 5);
  const totalCampaigns = allCampaigns.length;
  const activeCampaigns = allCampaigns.filter((c) => c.status === 'active').length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-gray-500">Overview of your overlay campaigns</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Campaigns" value={totalCampaigns} icon="🎯" />
        <StatCard title="Active Campaigns" value={activeCampaigns} icon="✅" />
        <StatCard
          title="Total Impressions"
          value={overview?.impressions ?? 0}
          icon="👁"
        />
        <StatCard
          title="Total Revenue Attributed"
          value={
            overview?.revenue != null
              ? `$${Number(overview.revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : '$0.00'
          }
          icon="💰"
        />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Recent Campaigns</h2>
        <div className="flex gap-2">
          <Link
            to="/campaigns/new"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            New Campaign
          </Link>
          <Link
            to="/merchants"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Merchants
          </Link>
        </div>
      </div>

      <div className="mt-4">
        {recentCampaigns.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow-card">
            No campaigns yet. Create one from Campaigns or use the link above.
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'type', label: 'Type' },
              {
                key: 'status',
                label: 'Status',
                render: (_, row) => <StatusBadge status={row.status} />,
              },
              { key: 'impressions', label: 'Impressions' },
              { key: 'revenueAttributed', label: 'Revenue', render: (v) => `$${Number(v || 0).toFixed(2)}` },
            ]}
            data={recentCampaigns}
            actions={(row) => (
              <Link
                to={`/campaigns/${row.id}/edit`}
                className="text-accent hover:underline"
              >
                Edit
              </Link>
            )}
          />
        )}
      </div>
    </div>
  );
}
