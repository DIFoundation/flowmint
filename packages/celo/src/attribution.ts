import {
  toDataSuffix,
  fromDataSuffix,
  verifyTx,
} from "@celo/attribution-tags";

export const FLOWMINT_ATTRIBUTION_TAG = "celo_c81681d9bae5";

export { fromDataSuffix, verifyTx };

export function appendAttribution(
  data: `0x${string}`,
): `0x${string}` {
  const suffix = toDataSuffix(FLOWMINT_ATTRIBUTION_TAG);

  return `${data}${suffix.slice(2)}` as `0x${string}`;
}
