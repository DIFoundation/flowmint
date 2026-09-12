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

export const CELO_CONTRACTS = {
  erc8004IdentityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",

  erc8004ReputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",

  usdcFeeCurrencyAdapter: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B",

  usdtFeeCurrencyAdapter: "0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72",
} as const;
