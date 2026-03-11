import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Sidebar />
      <main className="ml-56 min-h-screen">
        <header className="sticky top-0 z-30 h-14 border-b border-gray-200 bg-white shadow-card" />
        <div className="max-w-[1440px] p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
