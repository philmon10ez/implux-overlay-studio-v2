import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { isStagingEnvironment } from '../lib/appEnv';

export default function Layout() {
  const showStagingBanner = isStagingEnvironment();

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <main className="ml-56 min-h-screen bg-white">
        {showStagingBanner && (
          <div
            className="sticky top-0 z-40 border-b border-amber-700 bg-amber-500 px-4 py-2 text-center text-sm font-bold tracking-widest text-white"
            role="status"
            aria-label="Staging environment"
          >
            STAGING
          </div>
        )}
        <header className="sticky top-0 z-30 h-14 border-b border-gray-200 bg-white shadow-card" />
        <div className="max-w-[1440px] p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
