import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GTM Tracking Platform',
  description: 'Server-Side Tracking & Conversion Routing Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
