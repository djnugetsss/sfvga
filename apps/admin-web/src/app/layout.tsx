import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { AdminGuard } from '@/components/AdminGuard';

export const metadata: Metadata = {
  title: 'SFVGA Admin',
  description: 'SFVGA admin dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthProvider>
            <AdminGuard>{children}</AdminGuard>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
