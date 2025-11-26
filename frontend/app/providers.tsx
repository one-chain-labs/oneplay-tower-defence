'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  SuiClientProvider, 
  WalletProvider,
  ConnectButton 
} from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { useState } from 'react';
import '@mysten/dapp-kit/dist/index.css';

const networks = {
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
};

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
            <nav className="bg-black/20 backdrop-blur-lg border-b border-white/10">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-white">
                      🏰 Tower Defense GameFi
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <ConnectButton />
                  </div>
                </div>
              </div>
            </nav>
            {children}
          </div>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
