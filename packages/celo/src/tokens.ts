import { CELO_STABLECOINS, type CeloStablecoin, type Stablecoin } from "./addresses";

export { CELO_STABLECOINS, type CeloStablecoin, type Stablecoin };

export const FLOWMINT_STABLECOIN_ADDRESSES: `0x${string}`[] = Object.values(
  CELO_STABLECOINS,
).map((coin) => coin.address);

/**
 * Resolves a user-facing symbol ("USDC", "usdt", "USDm") or an on-chain
 * address into the matching CeloStablecoin. Returns undefined if it
 * isn't one of FlowMint's supported rails.
 */
export function resolveStablecoin(
  input: string,
): CeloStablecoin | undefined {
  const normalized = input.trim().toLowerCase();

  const bySymbol = Object.values(CELO_STABLECOINS).find(
    (coin) => coin.symbol.toLowerCase() === normalized,
  );

  if (bySymbol) {
    return bySymbol;
  }

  return Object.values(CELO_STABLECOINS).find(
    (coin) => coin.address.toLowerCase() === normalized,
  );
}

/**
 * Converts an amount denominated in one FlowMint stablecoin's smallest
 * units into the equivalent amount in another's, assuming a 1:1 USD peg
 * between all of them (no exchange-rate lookup — just decimal scaling).
 * Rounds UP on precision loss (e.g. 18-decimal -> 6-decimal) so a
 * recipient is never shortchanged by truncation.
 */
export function convertStablecoinAmount(
  amount: bigint,
  from: CeloStablecoin,
  to: CeloStablecoin,
): bigint {
  if (from.address.toLowerCase() === to.address.toLowerCase()) {
    return amount;
  }

  if (to.decimals >= from.decimals) {
    return amount * 10n ** BigInt(to.decimals - from.decimals);
  }

  const scale = 10n ** BigInt(from.decimals - to.decimals);
  const truncated = amount / scale;
  const remainder = amount % scale;

  return remainder > 0n ? truncated + 1n : truncated;
}