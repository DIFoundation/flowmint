import type { FlowIntent } from "./types";

export type IntentValidationResult =
  | { valid: true; intent: FlowIntent }
  | { valid: false; reason: string };

const MAX_DESCRIPTION_LENGTH = 500;
const MAX_CONSTRAINT_ENTRIES = 10;
const MAX_CONSTRAINT_VALUE_LENGTH = 200;

// Keys that must never be accepted from untrusted input, regardless of
// value, because they can be used to pollute prototypes or shadow
// object internals when constraints are later merged/spread elsewhere.
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Validates a raw, untrusted payload into a FlowIntent before it is
 * allowed anywhere near the decision layer. TypeScript types only
 * protect compile-time call sites; anything arriving over an API
 * boundary (HTTP body, LLM tool-call arguments, etc.) must be checked
 * at runtime too.
 */
export function validateFlowIntent(raw: unknown): IntentValidationResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, reason: "Intent must be a plain object." };
  }

  const candidate = raw as Record<string, unknown>;

  for (const key of Object.keys(candidate)) {
    if (FORBIDDEN_KEYS.has(key)) {
      return {
        valid: false,
        reason: `Intent contains a forbidden key: "${key}".`,
      };
    }
  }

  if (typeof candidate.description !== "string") {
    return { valid: false, reason: "Intent description must be a string." };
  }

  const description = candidate.description.trim();

  if (description.length === 0) {
    return { valid: false, reason: "Intent description must not be empty." };
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      valid: false,
      reason: `Intent description exceeds the maximum length of ${MAX_DESCRIPTION_LENGTH} characters.`,
    };
  }

  let maxBudget: bigint | undefined;

  if (candidate.maxBudget !== undefined) {
    if (
      typeof candidate.maxBudget !== "bigint" &&
      typeof candidate.maxBudget !== "number" &&
      typeof candidate.maxBudget !== "string"
    ) {
      return {
        valid: false,
        reason: "maxBudget must be a bigint, number, or numeric string.",
      };
    }

    try {
      maxBudget = BigInt(candidate.maxBudget as bigint | number | string);
    } catch {
      return { valid: false, reason: "maxBudget could not be parsed as an integer." };
    }

    if (maxBudget < 0n) {
      return { valid: false, reason: "maxBudget must not be negative." };
    }
  }

  let preferredCurrency: string | undefined;

  if (candidate.preferredCurrency !== undefined) {
    if (typeof candidate.preferredCurrency !== "string") {
      return { valid: false, reason: "preferredCurrency must be a string." };
    }

    preferredCurrency = candidate.preferredCurrency;
  }

  let constraints: Record<string, string> | undefined;

  if (candidate.constraints !== undefined) {
    if (
      candidate.constraints === null ||
      typeof candidate.constraints !== "object" ||
      Array.isArray(candidate.constraints)
    ) {
      return { valid: false, reason: "constraints must be a plain object." };
    }

    const rawConstraints = candidate.constraints as Record<string, unknown>;
    const entries = Object.entries(rawConstraints);

    if (entries.length > MAX_CONSTRAINT_ENTRIES) {
      return {
        valid: false,
        reason: `constraints must not have more than ${MAX_CONSTRAINT_ENTRIES} entries.`,
      };
    }

    constraints = {};

    for (const [key, value] of entries) {
      if (FORBIDDEN_KEYS.has(key)) {
        return {
          valid: false,
          reason: `constraints contains a forbidden key: "${key}".`,
        };
      }

      if (typeof value !== "string") {
        return {
          valid: false,
          reason: `constraints.${key} must be a string.`,
        };
      }

      if (value.length > MAX_CONSTRAINT_VALUE_LENGTH) {
        return {
          valid: false,
          reason: `constraints.${key} exceeds the maximum length of ${MAX_CONSTRAINT_VALUE_LENGTH} characters.`,
        };
      }

      constraints[key] = value;
    }
  }

  return {
    valid: true,
    intent: {
      description,
      maxBudget,
      preferredCurrency,
      constraints,
    },
  };
}