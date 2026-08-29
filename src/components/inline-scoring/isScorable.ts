import type { MatchUp } from '../../types';

/**
 * The name a side's participant is known by, or `undefined` when there isn't one.
 *
 * Returns `undefined` rather than a placeholder ON PURPOSE. `"Side 1"` reads like a legitimate name
 * everywhere it is subsequently displayed or persisted, so a fallback here is indistinguishable from
 * a real record. A refusal you can see beats a plausible value you cannot.
 */
export function sideParticipantName(matchUp: MatchUp | undefined, sideNumber: number): string | undefined {
  const sides = (matchUp as any)?.sides;
  const side = sides?.find?.((s: any) => s?.sideNumber === sideNumber) ?? sides?.[sideNumber - 1];
  const participant = side?.participant;
  if (!participant) return undefined;

  const direct = participant.participantName;
  if (typeof direct === 'string' && direct.trim().length > 0) return direct;

  const individuals = participant.individualParticipants ?? [];
  const joined = individuals
    .map((p: any) => (typeof p?.participantName === 'string' ? p.participantName.trim() : ''))
    .filter(Boolean)
    .join(' / ');
  return joined.length > 0 ? joined : undefined;
}

/**
 * May this matchUp be offered for interactive scoring at all?
 *
 * FAIL CLOSED. A scoring affordance leads to stored results, and the two things that make a stored
 * result trustworthy cannot be reconstructed afterwards:
 *
 * - **`matchUpFormat`** decides how a score is *interpreted*. It is determined by the tournamentRecord
 *   and delivered by the factory; there is no correct way to guess it. A score kept against an invented
 *   format is not slightly wrong, it is uninterpretable.
 * - **Named participants.** A result attributed to "Side 1" is indistinguishable from a genuine one at
 *   every point downstream.
 *
 * So a matchUp missing either is not scored with a substitute — it is not offered for scoring. That is
 * the only arrangement in which the substitute cannot exist.
 *
 * This lives in the LIBRARY rather than in each app deliberately. Both consumers had grown their own
 * weaker version of this check (participant existence, no name check, no format check), and
 * `renderInlineMatchUp` — the single place a scoring affordance is minted — defaulted the format for
 * everyone. A guard beside the thing it guards is structural; a guard in each app is a rule each app
 * has to remember.
 *
 * Costs nothing in practice: across a real production tournament (three events, 211 matchUps) every
 * matchUp carried a `matchUpFormat`, and the set passing this gate was exactly the set with two
 * hydrated, named sides.
 *
 * @param matchUpFormat optional override, matching `renderInlineMatchUp`'s parameter of the same name.
 */
export function isScorable(matchUp: MatchUp | undefined, matchUpFormat?: string): boolean {
  if (!matchUp?.matchUpId) return false;
  if (!(matchUpFormat || (matchUp as any).matchUpFormat)) return false;

  const sides = (matchUp as any).sides;
  if (!Array.isArray(sides) || sides.length !== 2) return false;

  return sideParticipantName(matchUp, 1) !== undefined && sideParticipantName(matchUp, 2) !== undefined;
}
