/**
 * Pure ISO-date range formatter shared by card primitives.
 *
 *   "May 22, 2026"                  (single date)
 *   "May 22 – May 24, 2026"         (same-year range)
 *   "Dec 30, 2025 – Jan 2, 2026"    (cross-year range)
 *
 * Returns undefined when neither bound is present or both parse as NaN.
 */

function formatMonthDay(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFull(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateRange(startISO?: string, endISO?: string): string | undefined {
  if (!startISO && !endISO) return undefined;
  const start = startISO ? new Date(startISO) : null;
  const end = endISO ? new Date(endISO) : null;

  const hasStart = !!start && !Number.isNaN(start.getTime());
  const hasEnd = !!end && !Number.isNaN(end.getTime());
  if (!hasStart && !hasEnd) return undefined;

  if (hasStart && hasEnd && start.getTime() === end.getTime()) {
    return formatFull(start);
  }
  if (hasStart && hasEnd) {
    if (start.getFullYear() === end.getFullYear()) {
      return `${formatMonthDay(start)} – ${formatMonthDay(end)}, ${end.getFullYear()}`;
    }
    return `${formatFull(start)} – ${formatFull(end)}`;
  }
  const only = hasStart ? start : (end as Date);
  return formatFull(only);
}
