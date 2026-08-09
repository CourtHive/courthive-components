/**
 * Shared court ordering.
 *
 * Both venue-locator (court list beside the map) and court-layout (the court grid) order a venue's
 * courts the same way, so the comparator lives here rather than in either component.
 */

export interface CourtOrderable {
  courtName: string;
  courtOrder?: number;
}

/**
 * TODS `courtOrder` ascending when present, otherwise the court name compared natural-numerically so
 * "Court 2" precedes "Court 10". Courts carrying an explicit order sort ahead of those without one —
 * a venue that has bothered to order some of its courts means those to come first.
 *
 * Non-mutating.
 */
export function sortCourtsByOrder<T extends CourtOrderable>(courts: T[]): T[] {
  return courts.slice().sort((a, b) => {
    const ao = a.courtOrder;
    const bo = b.courtOrder;
    if (Number.isFinite(ao) && Number.isFinite(bo) && ao !== bo) return (ao as number) - (bo as number);
    if (Number.isFinite(ao) && !Number.isFinite(bo)) return -1;
    if (!Number.isFinite(ao) && Number.isFinite(bo)) return 1;
    return a.courtName.localeCompare(b.courtName, undefined, { numeric: true });
  });
}
