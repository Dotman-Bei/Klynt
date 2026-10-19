import type { Metadata, Viewport } from 'next';
import { Chivo } from 'next/font/google';
import { Providers } from './providers';
import '@/styles/tokens.css';

const chivo = Chivo({ subsets: ['latin'], weight: ['400', '700', '900'], variable: '--font-chivo', display: 'swap' });

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
