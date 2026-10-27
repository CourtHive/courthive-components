import type { MatchUp, Side } from '../../types';

export type ParticipantPath = {
  /** every matchUp the participant appears in */
  played: string[];
  /** the matchUps the participant won: their outgoing connector is part of the path */
  won: string[];
  /** the matchUps ahead while the participant is still alive, by draw position */
  projected: string[];
  /** the matchUps whose outgoing connector leads along the projection: the latest, then each projected but the last */
  leads: string[];
};

/** The side's own participantId and, for a pair or team, its individuals': a hover reports either. */
function sideParticipantIds(side?: Side): string[] {
  const participant = side?.participant;
  if (!participant?.participantId) return [];
  const individualIds = (participant.individualParticipants ?? []).map(({ participantId }) => participantId);
  return [participant.participantId, ...individualIds];
}

/**
 * The matchUps ahead of a still-alive participant. From their latest matchUp, each later round is reached by
 * the draw's own shape: a round with half the matchUps maps `roundPosition` to `⌈roundPosition / 2⌉`, a feed
 * round (as many matchUps as the one before) keeps it. Stops at the first round the shape does not explain.
 */
function project(
  latest: MatchUp,
  roundCounts: Record<number, number>,
  byPosition: Map<string, MatchUp>,
  participantId: string
): string[] {
  const won = latest.winningSide && sideParticipantIds(latest.sides?.find((s) => s.sideNumber === latest.winningSide));
  const eliminated = latest.winningSide && !(won as string[]).includes(participantId);
  if (eliminated) return [];

  const projected: string[] = [];
  let roundNumber = latest.roundNumber as number;
  let roundPosition = latest.roundPosition as number;
  while (roundCounts[roundNumber + 1]) {
    const current = roundCounts[roundNumber];
    const next = roundCounts[roundNumber + 1];
    // a feed round (next === current) keeps the position
    if (next !== current) {
      if (next * 2 !== current) break;
      roundPosition = Math.ceil(roundPosition / 2);
    }
    roundNumber += 1;
    const matchUp = byPosition.get(`${roundNumber}|${roundPosition}`);
    if (!matchUp) break;
    projected.push(matchUp.matchUpId);
  }
  return projected;
}

/**
 * Index a structure's matchUps by participant, for path highlighting. `projectable` is false for draws whose
 * later rounds are not reached by position (round robin, ad hoc, lucky); their paths are then the matchUps
 * played, with nothing projected.
 */
export function buildPathIndex({
  roundProfile,
  projectable,
  matchUps
}: {
  roundProfile?: Record<string, { matchUpsCount?: number }>;
  projectable: boolean;
  matchUps: MatchUp[];
}): (participantId: string) => ParticipantPath | undefined {
  const byParticipant = new Map<string, MatchUp[]>();
  const byPosition = new Map<string, MatchUp>();
  for (const matchUp of matchUps) {
    if (matchUp.roundNumber && matchUp.roundPosition) {
      byPosition.set(`${matchUp.roundNumber}|${matchUp.roundPosition}`, matchUp);
    }
    for (const side of matchUp.sides ?? []) {
      for (const participantId of sideParticipantIds(side)) {
        const list = byParticipant.get(participantId) ?? [];
        list.push(matchUp);
        byParticipant.set(participantId, list);
      }
    }
  }

  const roundCounts: Record<number, number> = {};
  for (const [roundNumber, profile] of Object.entries(roundProfile ?? {})) {
    if (profile?.matchUpsCount) roundCounts[Number(roundNumber)] = profile.matchUpsCount;
  }

  const cache = new Map<string, ParticipantPath>();
  return (participantId: string) => {
    const appearances = byParticipant.get(participantId);
    if (!appearances?.length) return undefined;
    const cached = cache.get(participantId);
    if (cached) return cached;

    const won = appearances
      .filter((matchUp) => {
        const winner = matchUp.sides?.find((side) => side.sideNumber === matchUp.winningSide);
        return !!matchUp.winningSide && sideParticipantIds(winner).includes(participantId);
      })
      .map(({ matchUpId }) => matchUpId);
    const latest = appearances.reduce((a, b) => ((b.roundNumber ?? 0) > (a.roundNumber ?? 0) ? b : a), appearances[0]);
    const canProject = projectable && !!latest.roundNumber && !!latest.roundPosition;
    const projected = canProject ? project(latest, roundCounts, byPosition, participantId) : [];
    const path: ParticipantPath = {
      played: appearances.map(({ matchUpId }) => matchUpId),
      leads: projected.length ? [latest.matchUpId, ...projected.slice(0, -1)] : [],
      projected,
      won
    };
    cache.set(participantId, path);
    return path;
  };
}
