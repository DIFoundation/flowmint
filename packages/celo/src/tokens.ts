export interface Stablecoin {
  symbol: "USDm" | "USDC" | "USDT";
  address: `0x${string}`;
  decimals: number;
}

export const CELO_STABLECOINS = {
  USDm: {
    symbol: "USDm",
    address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    decimals: 18,
  },
  USDC: {
    symbol: "USDC",
    address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    decimals: 6,
  },
  USDT: {
    symbol: "USDT",
    address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    decimals: 6,
  },
} as const satisfies Record<string, Stablecoin>;

export type CeloStablecoin =
  (typeof CELO_STABLECOINS)[keyof typeof CELO_STABLECOINS];
