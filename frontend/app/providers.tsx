'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  SuiClientProvider,
  WalletProvider,
  ConnectButton
} from '@onelabs/dapp-kit';

import { useState, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { useCurrentAccount } from '@onelabs/dapp-kit';
import '@onelabs/dapp-kit/dist/index.css';
import '../lib/constants.ts';

import { en } from '../locales/en';
import { zh } from '../locales/zh';

// I18N SETUP START
const translations = {
  en,
  zh,
};

type Language = 'en' | 'zh';

interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string, params?: Record<string, string | number>) => {
    let translation = (translations[language] as Record<string, string>)[key] || key;
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        translation = translation.replace(`{${paramKey}}`, String(paramValue));
      }
    }
    return translation;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}
// I18N SETUP END

export const networks = {
  testnet: { url: 'https://rpc-testnet.onelabs.cc:443' },
  mainnet: { url: "https://rpc-mainnet.onelabs.cc:443" },
};

// Define NETWORK_RPC constant
const NETWORK_RPC = process.env.NEXT_PUBLIC_NETWORK || 'testnet'; // or 'mainnet' depending on your environment

function NavBar() {
  const pathname = usePathname();
  const account = useCurrentAccount();
  const isMainPage = pathname === '/' || pathname === '/town';
  const { language, setLanguage, t } = useI18n();

  return (
    <>
      {/* Logo - only on main page when logged in */}
      {isMainPage && account && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[60]">
          <img
            src="/logo.png"
            alt={t('Tower Defense GameFi')}
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

      {/* Wallet and language switcher */}
      <div className="fixed top-4 right-4 z-[60] flex items-center gap-x-4">
        <button
          onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
          className="px-3 py-2 text-sm font-medium text-white bg-black/20 rounded-md backdrop-blur-sm"
        >
          {language === 'en' ? '简体中文' : 'English'}
        </button>
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
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networks} defaultNetwork={NETWORK_RPC as 'testnet' | 'mainnet'}>
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
    </I18nProvider>
  );
}
