import { Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="merchants" element={<Merchants />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/new" element={<CampaignBuilder />} />
        <Route path="campaigns/:id/edit" element={<CampaignBuilder />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="recommendations/new" element={<RecommendationSetEditor />} />
        <Route path="recommendations/:id/edit" element={<RecommendationSetEditor />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="rakuten" element={<Rakuten />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
