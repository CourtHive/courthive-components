/**
 * The team score of a dual while it is being set by hand in the scorecard header. The header shows the sides left and
 * right (swapped when the scorecard is), so edits arrive by position and leave by side number:
 *
 * - the higher score wins; level scores need a winner chosen and how it was decided (a shootout, a competition rule,
 *   lots or an official decision), and until both are the score cannot be saved. The factory refuses a winner on a level
 *   tie that does not record its decision (`score.overtime` with `decidedIn: 'EXTERNAL'` and `decidedBy`);
 * - a score is a whole number, 0 or more;
 * - saving is offered only once the score differs from where it started.
 *
 * Pure: no DOM. The header's editor renders from it.
 */

export type Position = 'left' | 'right';

/** how a winner on a level score was decided: the factory's `DecidedByMethod` */
export type DecisionMethod = 'SHOOTOUT' | 'COMPETITION_RULE' | 'LOTS' | 'OFFICIAL_DECISION';
export const DECISION_METHODS: DecisionMethod[] = ['SHOOTOUT', 'COMPETITION_RULE', 'LOTS', 'OFFICIAL_DECISION'];

/** `decidedBy` is present only on a level score: a score that decides the dual needs no decision */
export type TeamScore = {
  decidedBy?: { method: DecisionMethod };
  side1Score: number;
  side2Score: number;
  winningSide?: number;
};

export function createTeamScoreOverride({
  side1Score = 0,
  side2Score = 0,
  winningSide,
  decidedBy,
  swapSides
}: Partial<TeamScore> & {
  swapSides?: boolean;
}) {
  const sideAt = (position: Position) => ((position === 'left') !== !!swapSides ? 1 : 2);
  const initial: TeamScore = { side1Score, side2Score, winningSide };
  let current: TeamScore = { ...initial };
  // a winner chosen for level scores; a decided score implies its own
  let chosen: number | undefined = side1Score === side2Score ? winningSide : undefined;
  // and how it was decided
  const initialMethod = side1Score === side2Score ? decidedBy?.method : undefined;
  let method: DecisionMethod | undefined = initialMethod;

  const level = () => current.side1Score === current.side2Score;
  const implied = () => (current.side1Score > current.side2Score ? 1 : 2);
  const winner = () => (level() ? chosen : implied());

  return {
    scoreAt: (position: Position) => (sideAt(position) === 1 ? current.side1Score : current.side2Score),
    setScore(position: Position, value: number) {
      if (!Number.isInteger(value) || value < 0) return false;
      current = { ...current, [`side${sideAt(position)}Score`]: value };
      return true;
    },
    needsWinner: level,
    chooseWinner(position: Position) {
      chosen = sideAt(position);
    },
    needsDecision: level,
    chooseMethod(value: DecisionMethod) {
      if (DECISION_METHODS.includes(value)) method = value;
    },
    methodChosen: (): DecisionMethod | undefined => (level() ? method : undefined),
    winnerAt: (): Position | undefined => {
      const side = winner();
      if (!side) return undefined;
      return sideAt('left') === side ? 'left' : 'right';
    },
    isValid: () => !!winner() && (!level() || !!method),
    isDirty: () =>
      current.side1Score !== initial.side1Score ||
      current.side2Score !== initial.side2Score ||
      winner() !== initial.winningSide ||
      (level() && method !== initialMethod),
    value: (): TeamScore => {
      const { side1Score, side2Score } = current;
      const decided = level() && method ? { decidedBy: { method } } : {};
      return { side1Score, side2Score, winningSide: winner(), ...decided };
    },
    reset() {
      current = { ...initial };
      chosen = side1Score === side2Score ? winningSide : undefined;
      method = initialMethod;
    }
  };
}

export type TeamScoreOverride = ReturnType<typeof createTeamScoreOverride>;
