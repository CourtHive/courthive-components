export function getChevronStyle({
  winnerChevron,
  isDoubles
}: {
  winnerChevron?: boolean;
  isDoubles?: boolean;
}): string {
  if (!winnerChevron) return '';
  return isDoubles ? 'chc-chevron-doubles--winner' : 'chc-chevron--winner';
}
