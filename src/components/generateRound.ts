import type { Composition, MatchUp } from '../types';

/* not used */
export const generateRound = ({
  composition,
  roundNumber,
  matchUps
}: {
  composition?: Composition;
  roundNumber: number;
  matchUps?: MatchUp[];
}): HTMLElement => {
  const roundMatchUps = (matchUps || [])
    .filter((matchUp) => matchUp.roundNumber === roundNumber)
    .sort((a, b) => (a.roundPosition || 0) - (b.roundPosition || 0));

  const content = roundMatchUps.map((matchUp) => matchUp.score?.scoreStringSide1 || 'Score').join('');

  const div = document.createElement('div');
  div.className = 'chc-round';
  if (composition?.theme) div.classList.add(composition.theme);

  div.innerHTML = content;

  return div;
};
