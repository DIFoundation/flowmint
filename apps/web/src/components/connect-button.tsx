"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const injectedConnector = connectors.find(
    (connector) => connector.id === "injected",
  );

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        className="rounded-lg border px-4 py-2 text-sm font-medium"
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={!injectedConnector || isPending}
      onClick={() => {
        if (injectedConnector) {
          connect({ connector: injectedConnector });
        }
      }}
      className="rounded-lg px-4 py-2 text-sm font-medium"
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
