import type { Metadata } from 'next';
import { Cormorant_Garamond, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

const display = Cormorant_Garamond({
  variable: '--font-display',
  subsets: ['cyrillic', 'latin'],
  weight: ['500', '600'],
});

const sans = IBM_Plex_Sans({
  variable: '--font-sans',
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600'],
});

const mono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://cinelanding.ru'),
  title: 'CineLanding — Turn an old website into a cinematic landing page',
  description: 'Turn an existing website into a cinematic landing page, from a free concept to a responsive build and source code.',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'CineLanding',
    title: 'CineLanding — Turn an old website into a cinematic landing page',
    description: 'Turn an existing website into a cinematic landing page, from a free concept to a responsive build and source code.',
    images: [
      {
        url: '/og.png',
        width: 1730,
        height: 909,
        alt: 'CineLanding — a cinematic, scroll-directed landing page workflow.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CineLanding — Turn an old website into a cinematic landing page',
    description: 'Turn an existing website into a cinematic landing page, from a free concept to a responsive build and source code.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${display.variable} ${sans.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
