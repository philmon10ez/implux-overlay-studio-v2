import { useState, useEffect } from 'react';
import api from '../lib/api';

const BRAND_COLORS_KEY = 'implux-brand-colors';

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'admin' });
  const [addError, setAddError] = useState('');
  const [brandColors, setBrandColors] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BRAND_COLORS_KEY) || '{}');
    } catch {
      return {};
  }
  });
  const [webhookLog, setWebhookLog] = useState([]);

  useEffect(() => {
    // Team: backend may not have GET /api/users; we only have /api/auth/me for current user
    setUsers([]);
  }, []);

  useEffect(() => {
    localStorage.setItem(BRAND_COLORS_KEY, JSON.stringify(brandColors));
  }, [brandColors]);

  const addUser = (e) => {
    e.preventDefault();
    setAddError('');
    api.auth
      .register(newUser.email, newUser.password, newUser.role)
      .then(() => {
        setNewUser({ email: '', password: '', role: 'admin' });
        setAddError(''); // backend may not have register; show friendly message
      })
      .catch((err) => {
        setAddError(err.body?.error || err.message || 'Failed. Backend may not expose /api/auth/register.');
      });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="mt-1 text-gray-500">Team, brand, and app configuration</p>

      <div className="mt-8 space-y-8">
        <section className="rounded-lg bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-gray-900">Team</h2>
          <p className="mt-1 text-sm text-gray-500">Add team members (requires backend register endpoint)</p>
          <form onSubmit={addUser} className="mt-4 flex flex-wrap gap-4">
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
              placeholder="Email"
              className="rounded border border-gray-300 px-3 py-2"
              required
            />
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
              placeholder="Password"
              className="rounded border border-gray-300 px-3 py-2"
              required
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
              className="rounded border border-gray-300 px-3 py-2"
            >
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90">
              Add User
            </button>
          </form>
          {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
        </section>

        <section className="rounded-lg bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-gray-900">Shopify App</h2>
          <p className="mt-1 text-sm text-gray-500">Credentials are configured in Railway (SHOPIFY_API_KEY, SHOPIFY_API_SECRET). Not displayed here.</p>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-gray-900">Default Brand Colors</h2>
          <p className="mt-1 text-sm text-gray-500">Saved to localStorage for use across the app.</p>
          <div className="mt-4 flex flex-wrap gap-4">
            <div>
              <label className="block text-xs text-gray-500">Primary</label>
              <input
                type="color"
                value={brandColors.primary || '#6c63ff'}
                onChange={(e) => setBrandColors((b) => ({ ...b, primary: e.target.value }))}
                className="mt-1 h-10 w-20 cursor-pointer rounded border"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Background</label>
              <input
                type="color"
                value={brandColors.background || '#ffffff'}
                onChange={(e) => setBrandColors((b) => ({ ...b, background: e.target.value }))}
                className="mt-1 h-10 w-20 cursor-pointer rounded border"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-gray-900">Webhook Log</h2>
          <p className="mt-1 text-sm text-gray-500">Recent incoming webhook events (placeholder — backend would push or store these).</p>
          <div className="mt-4 overflow-x-auto">
            {webhookLog.length === 0 ? (
              <p className="text-sm text-gray-400">No events recorded.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2">Time</th>
                    <th className="py-2">Source</th>
                    <th className="py-2">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {webhookLog.map((e, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2">{e.time}</td>
                      <td className="py-2">{e.source}</td>
                      <td className="py-2 font-mono text-xs">{JSON.stringify(e.payload)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
