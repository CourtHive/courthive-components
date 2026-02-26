import type { Configuration } from '../types';

export function getMatchUpStyle({ configuration }: { configuration?: Configuration }): string {
  // The base .chc-matchup class handles all static properties.
  // Dynamic matchUpHover is handled via a data attribute + CSS, or inline style by the caller.
  // If a custom hover color is needed, caller should set:
  //   element.dataset.hoverColor = configuration.matchUpHover
  // and we add a class that the caller can use to apply the inline style.
  if (configuration?.matchUpHover) {
    return 'chc-matchup chc-matchup--custom-hover';
  }
  return 'chc-matchup';
}
