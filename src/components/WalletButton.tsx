'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { botChain, shortAddress } from '@/lib/chain';

/** Connection state, with the wrong-network and no-wallet cases spelled out (PRD 6.3). */
export function useWallet() {
  const { address, chainId, isConnected, status } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [hasInjected, setHasInjected] = useState(true);
  useEffect(() => setHasInjected(typeof window !== 'undefined' && 'ethereum' in window), []);
  const injected = connectors[0];
  return {
    address,
    chainId,
    isConnected,
    status,
    wrongNetwork: isConnected && chainId !== botChain.id,
    hasInjected,
    connecting: isPending,
    error,
    connect: () => injected && connect({ connector: injected, chainId: botChain.id }),
    disconnect: () => disconnect(),
    switchNetwork: () => switchChain({ chainId: botChain.id }),
    switching,
  };
}

/** The plain text link used in the Home navigation. */
export function WalletLink({ className }: { className?: string }) {
  const w = useWallet();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className={className}>Connect wallet</span>;
  if (w.isConnected && w.address) {
    return (
      <a className={className} href="/profile">
        {w.wrongNetwork ? 'Wrong network' : shortAddress(w.address)}
      </a>
    );
  }
  if (!w.hasInjected) {
    return (
      <a className={className} href="https://metamask.io/download/" rel="noopener noreferrer" target="_blank">
        Get a wallet
      </a>
    );
  }
  return (
    <button type="button" className={className} onClick={w.connect} disabled={w.connecting}>
      {w.connecting ? 'Connecting…' : 'Connect wallet'}
    </button>
  );
}
