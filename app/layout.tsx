import type { Metadata, Viewport } from 'next';
import { Courier_Prime, Hanken_Grotesk, Newsreader } from 'next/font/google';
import './globals.css';

const display = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const body = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const mono = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Keystone — a field guide to India’s threatened wildlife',
  description: 'Photograph an animal, identify it instantly, and see which species depend on it.',
};

export const viewport: Viewport = {
  themeColor: '#0A1F30',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen">
        {/* Duotone filter used by SpecimenPhoto: shadows to Prussian blue, highlights to paper. */}
        <svg aria-hidden width="0" height="0" style={{ position: 'absolute' }}>
          <filter id="cyanotype" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0"
            />
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.035 0.2 0.91" />
              <feFuncG type="table" tableValues="0.13 0.42 0.945" />
              <feFuncB type="table" tableValues="0.26 0.62 0.957" />
            </feComponentTransfer>
          </filter>
        </svg>
        {children}
      </body>
    </html>
  );
}
