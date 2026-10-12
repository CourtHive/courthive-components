/**
 * The date an age category is considered on: the one the host configured, else TODAY, worked out at
 * the call. Never a module-level constant: computed at import, it froze on the day the page loaded,
 * and a long-running page (TMX runs all tournament week) went on offering that day after midnight.
 *
 * Today is the UTC date, the same fallback the factory uses when no tournament zone is known. A host
 * that knows the tournament's zone passes its calendar day as the configured date instead.
 */
export function consideredDateOrToday(configured?: string): string {
  return configured || new Date().toISOString().split('T')[0];
}
