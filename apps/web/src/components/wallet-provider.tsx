"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { WagmiProvider, createConfig, http, useConnect, useAccount, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { celo } from "wagmi/chains";

const wagmiConfig = createConfig({
  chains: [celo],
  connectors: [
    injected(),
  ],
  transports: {
    [celo.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

function WalletProviderInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const { connect, connectors } = useConnect();
  const { chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (window.ethereum?.isMiniPay) {
      const injectedConnector = connectors.find(
        (connector) => connector.id === "injected",
      );

      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    }

    if (!window.ethereum.isMiniPay && chainId !== celo.id) {
      switchChain({ chainId: celo.id });
    }
  }, [connect, connectors, chainId, switchChain]);

  return <>{children}</>;
}

export function WalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletProviderInner>{children}</WalletProviderInner>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
