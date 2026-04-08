import { NavLink, useNavigate } from 'react-router-dom';
import api from '../lib/api';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/campaigns', label: 'Campaigns', icon: '🎯' },
  { to: '/recommendations', label: 'Recommendations', icon: '🛍' },
  { to: '/merchants', label: 'Merchants', icon: '🏪' },
  { to: '/analytics', label: 'Analytics', icon: '📈' },
  { to: '/rakuten', label: 'Rakuten', icon: '🔗' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const handleLogout = () => {
    api.auth.logout().then(() => navigate('/login', { replace: true }));
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 bg-sidebar text-white">
      <div className="flex h-14 items-center border-b border-white/10 px-4">
        <span className="font-semibold text-accent">Implux.io</span>
      </div>
      <nav className="mt-4 space-y-0.5 px-2">
        {nav.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive ? 'bg-accent/20 text-accent' : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="absolute bottom-4 left-4 right-4">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg border border-white/20 px-3 py-2 text-sm text-gray-300 hover:bg-white/10"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
