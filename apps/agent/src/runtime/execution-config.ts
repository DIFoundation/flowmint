import "dotenv/config";

const LIVE_EXECUTION_VALUE =
  process.env.FLOWMINT_LIVE_EXECUTION?.trim().toLowerCase();

export const FLOWMINT_LIVE_EXECUTION =
  LIVE_EXECUTION_VALUE === "true";

export function assertLiveExecutionEnabled(): void {
  if (!FLOWMINT_LIVE_EXECUTION) {
    throw new Error(
      "Live execution is disabled. Set FLOWMINT_LIVE_EXECUTION=true to broadcast a real transaction.",
    );
  }
}