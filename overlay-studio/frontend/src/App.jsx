import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from './lib/api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Merchants from './pages/Merchants';
import Campaigns from './pages/Campaigns';
import CampaignBuilder from './pages/CampaignBuilder';
import Analytics from './pages/Analytics';
import Rakuten from './pages/Rakuten';
import Settings from './pages/Settings';
import Recommendations from './pages/Recommendations';
import RecommendationSetEditor from './pages/RecommendationSetEditor';

function ProtectedRoute({ children }) {
  const [ok, setOk] = useState(null);
  useEffect(() => {
    api.auth
      .me()
      .then(() => setOk(true))
      .catch(() => setOk(false));
  }, []);
  if (ok === null) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!ok) return <Navigate to="/login" replace />;
  return children;
}

/** Data router so `useBlocker` (e.g. RecommendationSetEditor) works; `BrowserRouter` does not provide that context. */
export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'merchants', element: <Merchants /> },
      { path: 'campaigns', element: <Campaigns /> },
      { path: 'campaigns/new', element: <CampaignBuilder /> },
      { path: 'campaigns/:id/edit', element: <CampaignBuilder /> },
      { path: 'recommendations', element: <Recommendations /> },
      { path: 'recommendations/new', element: <RecommendationSetEditor /> },
      { path: 'recommendations/:id/edit', element: <RecommendationSetEditor /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'rakuten', element: <Rakuten /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
