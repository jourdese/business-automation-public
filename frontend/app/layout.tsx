import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { palette } from '@/lib/jourvis/config';
import { SiteHeader, SiteFooter } from '@/components/jourvis/SiteChrome';
import './globals.css';
import './refinements.css';
export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  metadataBase: new URL('https://jourvis.vercel.app'),
  title: {
    default: 'Jourvis — Your business, with room to breathe',
    template: '%s | Jourvis',
  },
  openGraph: {
    type: 'website',
    siteName: 'Jourvis',
    title: 'Jourvis — Your business, with room to breathe',
    description:
      'Meet your everyday assistant for questions, appointments, and the details in between.',
    images: [
      {
        url: '/jourvis-social.png',
        width: 1200,
        height: 630,
        alt: 'Jourvis, the mint pixel companion. Your business, with room to breathe.',
      },
    ],
  },
  twitter: { card: 'summary_large_image', images: ['/jourvis-social.png'] },
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
