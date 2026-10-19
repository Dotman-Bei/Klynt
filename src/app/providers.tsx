'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from '@wagmi/core';
import { botChain } from '@/lib/chain';

const config = createConfig({
  chains: [botChain],
  connectors: [injected()],
  transports: { [botChain.id]: http() },
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
