/**
 * Client-safe analytics constants.
 *
 * Shared by the dashboard UI, the server-function input validators (which run
 * in the browser as well as on the server) and the server-side aggregation.
 */
export const RANGE_HOURS: Record<string, number> = {
  "5h": 5,
  "24h": 24,
  "7d": 24 * 7,
  month: 24 * 30,
  year: 24 * 365,
  all: 24 * 365 * 20,
};

/** Longest a single visit may count for, in seconds (guards bad clocks). */
export const MAX_VISIT_SECONDS = 7200;
