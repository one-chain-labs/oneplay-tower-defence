import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Tower Defense GameFi - Play to Earn on Onechain',
  description: 'A blockchain tower defense game on Onechain Network. Mint NFT towers and monsters, play strategic gameplay, earn rewards, and trade on the marketplace!',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
