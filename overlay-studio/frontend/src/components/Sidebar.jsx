import { NavLink, useNavigate, Link } from 'react-router-dom';
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
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 bg-poptek-rail text-white">
      <div className="flex h-14 min-h-14 shrink-0 items-center border-b border-white/15 px-2 py-1.5">
        <Link
          to="/dashboard"
          className="flex h-full min-h-0 w-full min-w-0 items-center justify-start"
          aria-label="Poptek home"
        >
          <img
            src="/poptek-logo-designer.png"
            alt="Poptek"
            className="block h-full max-h-full w-full object-contain object-left"
            decoding="async"
          />
        </Link>
      </div>
      <nav className="mt-4 space-y-0.5 px-2">
        {nav.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-white/15 font-medium text-white shadow-sm ring-1 ring-white/25'
                  : 'text-white/85 hover:bg-white/10 hover:text-white'
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
          className="w-full rounded-lg border border-white/25 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
