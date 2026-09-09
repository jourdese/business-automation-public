import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { palette } from '@/lib/jourvis/config';
import { SiteHeader, SiteFooter } from '@/components/jourvis/SiteChrome';
import './globals.css';
export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  metadataBase: new URL('https://jourvis.vercel.app'),
  title: {
    default: 'Jourvis — Your business, with room to breathe',
    template: '%s | Jourvis',
  },
  description:
    'Meet Jourvis, your AI business assistant for customer questions, appointment coordination, and everyday work. Try an interactive local preview.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = Object.fromEntries(
    Object.entries(palette).map(([name, value]) => ['--' + name, value]),
  ) as CSSProperties;
  return (
    <html lang="en" style={theme}>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
