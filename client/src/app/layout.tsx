import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';
import { AppLayout } from '../components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'RetailPulse - Inventory & POS Management',
  description: 'Enterprise retail inventory, audit logging, POS transactions, and reporting.'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <AppLayout>{children}</AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
