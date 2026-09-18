import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/sonner';
import { Layout as AppLayout } from '@/components/layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'PROOF',
  description: 'Human identity and authorization-evidence layer',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Providers>
          <AppLayout>
            {children}
          </AppLayout>
          <Toaster position="top-center" />
        </Providers>
      </body>
    </html>
  );
}
