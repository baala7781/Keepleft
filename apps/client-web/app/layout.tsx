import type { Metadata, Viewport } from 'next';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import {LegalConsentGate} from '@/components/legal-consent-gate';

export const viewport: Viewport = {
  themeColor: '#0b0c0e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://yourleft.run'),
  title: {
    default: 'YourLeft — Your run, replayed as a living miniature world',
    template: '%s | YourLeft',
  },
  description:
    'An AI-powered 3D animated running app. Turn your outdoor runs, walks, and rides into a stylized miniature world with elevation, buildings, and tree canopies. 100% on-device and private by design.',
  keywords: [
    'running app',
    '3D running replay',
    'miniature world',
    'GPS running tracker',
    'private running app',
    'cycling tracker',
    'walking tracker',
    'YourLeft',
    'route replay',
  ],
  authors: [{ name: 'YourLeft' }],
  creator: 'YourLeft',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://yourleft.run',
    siteName: 'YourLeft',
    title: 'YourLeft — Your run, replayed as a living miniature world',
    description:
      'Record outdoors, then replay your journey through a stylized 3D miniature landscape. Zero accounts, 100% on-device privacy.',
    images: [
      {
        url: '/yourleft-feature.png',
        width: 1024,
        height: 500,
        alt: 'YourLeft 3D route replayed as a miniature world',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YourLeft — Your run, replayed as a living miniature world',
    description:
      'Record outdoors, then replay your journey through a stylized 3D miniature landscape. Zero accounts, 100% on-device privacy.',
    images: ['/yourleft-feature.png'],
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/yourleft-mark.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="antialiased bg-[#0b0c0e] text-[#f5f5f5] selection:bg-[#e33b63] selection:text-white">
        <LegalConsentGate>{children}</LegalConsentGate>
      </body>
    </html>
  );
}
