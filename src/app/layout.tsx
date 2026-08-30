import type { Metadata } from 'next';
import './globals.css';
import { getServerLocale } from '@/i18n/server';

export const metadata: Metadata = {
  title: 'Misto Kitchen Procurement',
  description: 'AI-assisted HoReCa procurement cockpit',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getServerLocale();
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
