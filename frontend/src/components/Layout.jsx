import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ title, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-screen-xl px-4 py-6 md:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
