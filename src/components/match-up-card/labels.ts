/** Display wording only. These labels never decide completion, readiness or available actions. */
export const matchUpStatusLabels: Readonly<Record<string, string>> = {
  COMPLETED: 'Finished',
  TO_BE_PLAYED: 'To play',
  IN_PROGRESS: 'On court',
  SUSPENDED: 'Suspended',
  RETIRED: 'Retired',
  WALKOVER: 'Walkover',
  DEFAULTED: 'Defaulted',
  ABANDONED: 'Abandoned',
  CANCELLED: 'Cancelled',
  NOT_PLAYED: 'Not played',
  BYE: 'BYE',
  DOUBLE_DEFAULT: 'Double default'
};
export function matchUpStatusLabel(
  code: string | undefined,
  labels = matchUpStatusLabels,
  unknown = 'Status unavailable'
) {
  return code ? (labels[code] ?? unknown) : unknown;
}
