'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  SuiClientProvider, 
  WalletProvider,
  ConnectButton 
} from '@onelabs/dapp-kit';
import { getFullnodeUrl } from '@onelabs/sui/client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCurrentAccount } from '@onelabs/dapp-kit';
import '@onelabs/dapp-kit/dist/index.css';

const networks = {
  testnet: { url: 'https://rpc-testnet.onelabs.cc' },
  mainnet: { url: getFullnodeUrl('mainnet') },
};

function NavBar() {
  const pathname = usePathname();
  const account = useCurrentAccount();
  const isMainPage = pathname === '/' || pathname === '/town';

  return (
    <>
      {/* Logo - only on main page when logged in */}
      {isMainPage && account && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[60]">
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
        </div>
      )}
      
      {/* Wallet button - always visible */}
      <div className="fixed top-4 right-4 z-[60]">
        <ConnectButton />
      </div>
    </>
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
        <WalletProvider 
          autoConnect
          preferredWallets={['Sui Wallet', 'OneWallet']}
        >
          <div className="min-h-screen">
            <NavBar />
            {children}
          </div>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
