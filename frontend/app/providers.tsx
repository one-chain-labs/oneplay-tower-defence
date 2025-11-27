'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  SuiClientProvider, 
  WalletProvider,
  ConnectButton 
} from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import '@mysten/dapp-kit/dist/index.css';

const networks = {
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
};

function NavBar() {
  const pathname = usePathname();
  const isTownPage = pathname === '/town';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex justify-center items-center h-32 relative">
          <div className="absolute left-0">
            {/* Empty space for balance */}
          </div>
          <div className="flex items-center">
            {isTownPage && (
              <img 
                src="/logo.png" 
                alt="Tower Defense GameFi" 
                className="drop-shadow-2xl"
                style={{
                  filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.8))',
                  height: '100px',
                  width: 'auto',
                  maxWidth: '800px'
                }}
              />
            )}
          </div>
          <div className="absolute right-0 flex items-center gap-4">
            <ConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <div className="min-h-screen">
            <NavBar />
            <div className="pt-32">
              {children}
            </div>
          </div>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
