/**
 * Premium screen codes. Everything else is free.
 *
 * DOOM  — Doomsday thesis, position sizer, charts
 * AGN   — AI analyst
 * JRN   — Trading journal
 * SRC   — Sources deep-dive
 */
export const PREMIUM_SCREENS = new Set(["DOOM", "AGN", "JRN", "SRC"]);

/** True when `plan` means the user has paid access. */
export function isPro(plan) {
  return plan === "pro";
}
