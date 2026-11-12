import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TailorBook Admin — Multi-Tenant Management',
  description: 'Manage tailoring shops, device authorizations, and license allocations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

