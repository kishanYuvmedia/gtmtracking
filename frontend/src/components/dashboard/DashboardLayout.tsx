import React, { useEffect, useState } from 'react';
import { DashboardSidebar, DashboardPage } from './DashboardSidebar';
import { DashboardTopBar } from './DashboardTopBar';

interface DashboardLayoutProps {
  activePage: DashboardPage;
  onNavigate: (page: DashboardPage) => void;
  onProfile?: () => void;
  onLogout?: () => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  activePage,
  onNavigate,
  onProfile,
  onLogout,
  children,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [activePage]);

  const handleNavigate = (page: DashboardPage) => {
    setMobileNavOpen(false);
    onNavigate(page);
  };

  return (
    <div className="flex h-screen flex-col bg-bg overflow-hidden">
      <DashboardTopBar
        onProfile={onProfile}
        onLogout={onLogout}
        onMenuToggle={() => setMobileNavOpen((open) => !open)}
      />

      <div className="flex flex-1 min-h-0 relative">
        <DashboardSidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />
        <main className="flex-1 min-w-0 overflow-y-auto p-6 lg:p-8 bg-bg">{children}</main>
      </div>
    </div>
  );
};