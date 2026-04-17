import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

/** Avoid N+1 overload when many merchants are connected; list page has per-store detail. */
const MAX_MERCHANTS_FOR_REC_AGGREGATE = 10;

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [recSummary, setRecSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [ov, list, mres] = await Promise.all([
          api.analytics.overview(),
          api.campaigns.list(),
          api.merchants.list(),
        ]);
        if (cancelled) return;
        setOverview(ov);
        const all = list.campaigns || [];
        setAllCampaigns(all);
        const merchants = mres.merchants || [];

        if (merchants.length === 0) {
          setRecSummary({ total: 0, active: 0, note: 'no_stores' });
        } else if (merchants.length > MAX_MERCHANTS_FOR_REC_AGGREGATE) {
          setRecSummary({ total: null, active: null, note: 'many_stores' });
        } else {
          try {
            const lists = await Promise.all(
              merchants.map((m) =>
                api.recommendationSets.list(m.id).then((r) => r.recommendationSets || [])
              )
            );
            if (cancelled) return;
            const total = lists.reduce((acc, sets) => acc + sets.length, 0);
            const active = lists.reduce(
              (acc, sets) => acc + sets.filter((s) => s.status === 'active').length,
              0
            );
            setRecSummary({ total, active, note: null });
          } catch {
            if (!cancelled) setRecSummary({ total: null, active: null, note: 'error' });
          }
        }
      } catch {
        if (!cancelled) {
          setOverview(null);
          setAllCampaigns([]);
          setRecSummary(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="text-gray-500">Loading...</div>;

  const recentCampaigns = allCampaigns.slice(0, 5);
  const totalCampaigns = allCampaigns.length;
  const activeCampaigns = allCampaigns.filter((c) => c.status === 'active').length;

  const recValue =
    recSummary?.note === 'many_stores'
      ? '—'
      : recSummary?.total != null
        ? recSummary.total
        : '—';
  const recSub =
    recSummary?.note === 'many_stores'
      ? 'Open Recommendations to manage each store'
      : recSummary?.note === 'no_stores'
        ? 'Connect a store under Merchants to build sets'
        : recSummary?.note === 'error'
          ? 'Couldn’t load counts — try Recommendations'
          : recSummary?.active != null
            ? `${recSummary.active} active`
            : undefined;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-gray-500">
        Overview of overlay campaigns, product recommendation sets, and storefront performance
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Total Campaigns" value={totalCampaigns} icon="🎯" />
        <StatCard title="Active Campaigns" value={activeCampaigns} icon="✅" />
        <StatCard title="Recommendation sets" value={recValue} sub={recSub} icon="🛍" />
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
        <div className="flex flex-wrap gap-2">
          <Link
            to="/campaigns/new"
            className="rounded-lg bg-poptek-action px-4 py-2 text-sm font-medium text-white hover:bg-poptek-action/90"
          >
            New Campaign
          </Link>
          <Link
            to="/recommendations"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Recommendations
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
                className="text-poptek-action hover:underline"
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
