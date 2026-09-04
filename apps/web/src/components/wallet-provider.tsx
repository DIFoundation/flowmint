"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { WagmiProvider, createConfig, http, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { celo, celoSepolia } from "wagmi/chains";
import { ConnectButton } from "./connect-button";

const wagmiConfig = createConfig({
  chains: [celo, celoSepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [celo.id]: http(),
    [celoSepolia.id]: http(),
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

  useEffect(() => {
    if (window.ethereum?.isMiniPay) {
      const injectedConnector = connectors.find(
        (connector) => connector.id === "injected",
      );

      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    }
  }, [connect, connectors]);

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
