import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Providers } from './providers';
import '@/styles/tokens.css';

// Chivo (SIL Open Font License), self-hosted so builds never depend on Google Fonts being reachable.
const chivo = localFont({
  src: [{ path: './fonts/chivo-latin-variable.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-chivo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Klynt — browser games on BOT Chain', template: '%s · Klynt' },
  description:
    'Play casual browser games, rank on checked leaderboards, and claim capped rewards on BOT Chain when a season is funded.',
};

export const viewport: Viewport = { themeColor: '#ecf0f1' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={chivo.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
