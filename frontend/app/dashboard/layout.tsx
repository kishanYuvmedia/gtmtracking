'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WebsiteProvider } from '@/lib/contexts/website';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <WebsiteProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:pl-64">
          <Header />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </WebsiteProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
