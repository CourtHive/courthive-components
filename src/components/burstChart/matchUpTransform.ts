/**
 * Transform utilities for converting between data formats and the TODS-aligned
 * SunburstDrawData intermediate format consumed by burstChartD3v7.
 *
 * Two adapters:
 * - fromFactoryDrawData: tods-competition-factory getEventData().drawsData structure → SunburstDrawData
 * - fromLegacyDraw: legacy TournamentDraw JSON (R128/R64/.../W) → SunburstDrawData
 */

import type { SunburstDrawData, SunburstMatchUp, SunburstSide } from './burstChartD3v7';

// ============================================================================
// fromFactoryDrawData — tods-competition-factory → SunburstDrawData
// ============================================================================

/**
 * Convert a tods-competition-factory `getEventData().drawsData[i].structures[0]`
 * object into the TODS-aligned SunburstDrawData that the sunburst consumes.
 */
export function fromFactoryDrawData(structure: any): SunburstDrawData {
  const roundMatchUps: Record<number, SunburstMatchUp[]> = {};

  for (const [roundNum, matchUps] of Object.entries(structure.roundMatchUps)) {
    roundMatchUps[Number(roundNum)] = (matchUps as any[]).map((mu) => ({
      roundNumber: mu.roundNumber,
      roundName: mu.roundName,
      matchUpStatus: mu.matchUpStatus,
      winningSide: mu.winningSide,
      drawPositions: mu.drawPositions || [],
      scoreString:
        mu.winningSide === 1
          ? mu.score?.scoreStringSide1
          : mu.winningSide === 2
            ? mu.score?.scoreStringSide2
            : undefined,
      sides: (mu.sides || []).map((s: any) => ({
        sideNumber: s.sideNumber,
        drawPosition: s.drawPosition,
        participantName: s.participant?.participantName,
        nationalityCode: s.participant?.person?.nationalityCode,
        seedNumber: s.seedNumber,
        entryStatus: s.participant?.entryStatus,
      })),
    }));
  }

  // drawSize = 2 * matchUps in round 1
  const round1Count = roundMatchUps[1]?.length || 0;
  return {
    drawSize: round1Count * 2,
    roundMatchUps,
    seedAssignments: structure.seedAssignments,
  };
}

// ============================================================================
// fromLegacyDraw — legacy TournamentDraw → SunburstDrawData
// ============================================================================

/** Map legacy entry codes to TODS entryStatus values */
const ENTRY_STATUS_MAP: Record<string, string> = {
  WC: 'WILDCARD',
  Q: 'QUALIFIER',
  LL: 'LUCKY_LOSER',
};

/** Legacy round keys ordered from largest (outermost) to smallest (innermost) */
const ROUND_KEYS = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F'] as const;

/**
 * Convert a legacy TournamentDraw (with R128/R64/.../F/W round keys)
 * into the TODS-aligned SunburstDrawData.
 */
export function fromLegacyDraw(tournamentDraw: any): SunburstDrawData {
  // Determine which rounds have data, ordered outermost → innermost
  const activeRounds: { key: string; data: any[] }[] = [];
  let found = false;
  for (const key of ROUND_KEYS) {
    const data = tournamentDraw[key];
    if (data && data.length > 0) found = true;
    if (found && data && data.length > 0) {
      activeRounds.push({ key, data });
    }
  }

  if (activeRounds.length === 0) {
    return { drawSize: 0, roundMatchUps: {} };
  }

  const firstRoundData = activeRounds[0].data;
  const drawSize = firstRoundData.length;

  // Build a lookup from player name → first-round info for drawPosition/seed/country
  const playerInfoMap = new Map<
    string,
    { drawPosition: number; country: string; seed?: string | number; entry?: string }
  >();
  firstRoundData.forEach((p, idx) => {
    const name = normalizeName(p.player);
    if (name && name !== 'BYE') {
      playerInfoMap.set(name, {
        drawPosition: p.Draw ?? idx + 1,
        country: p.country,
        seed: p.seed,
        entry: p.entry,
      });
    }
  });

  // Build a set of winners for each round (player names appearing in the next round)
  // For round i, winners are the players that appear in round i+1 (or in 'W' for the final)
  const winnerSets: Map<string, Set<string>> = new Map();
  for (let i = 0; i < activeRounds.length; i++) {
    const nextRoundData = i + 1 < activeRounds.length ? activeRounds[i + 1].data : tournamentDraw['W'] || [];
    const winners = new Set<string>();
    for (const p of nextRoundData) {
      const name = normalizeName(p.player);
      if (name) winners.add(name);
    }
    winnerSets.set(activeRounds[i].key, winners);
  }

  const roundMatchUps: Record<number, SunburstMatchUp[]> = {};

  // Round 1 (outermost): pair consecutive players into matchUps
  const round1MatchUps: SunburstMatchUp[] = [];
  const winners1 = winnerSets.get(activeRounds[0].key) || new Set();

  for (let i = 0; i < firstRoundData.length; i += 2) {
    const p1 = firstRoundData[i];
    const p2 = firstRoundData[i + 1];
    const name1 = normalizeName(p1?.player);
    const name2 = normalizeName(p2?.player);

    const isBye = name1 === 'BYE' || name2 === 'BYE';
    const winningSide = isBye
      ? name1 === 'BYE'
        ? 2
        : 1
      : winners1.has(name1)
        ? 1
        : winners1.has(name2)
          ? 2
          : undefined;

    // Determine score: the winner's score from round 2 data
    let scoreString: string | undefined;
    if (!isBye && activeRounds.length > 1) {
      const nextRound = activeRounds[1].data;
      const winnerName = winningSide === 1 ? name1 : name2;
      const winnerInNext = nextRound.find((p) => normalizeName(p.player) === winnerName);
      scoreString = winnerInNext?.score;
    }

    const matchUpStatus = isBye ? 'BYE' : winningSide ? 'COMPLETED' : 'TO_BE_PLAYED';

    round1MatchUps.push({
      roundNumber: 1,
      matchUpStatus,
      winningSide,
      drawPositions: [p1?.Draw ?? i + 1, p2?.Draw ?? i + 2],
      scoreString,
      sides: [makeSide(1, p1, i + 1), makeSide(2, p2, i + 2)],
    });
  }
  roundMatchUps[1] = round1MatchUps;

  // Subsequent rounds (2, 3, ...): each player is a winner from the previous round
  for (let ri = 1; ri < activeRounds.length; ri++) {
    const roundNumber = ri + 1;
    const roundData = activeRounds[ri].data;
    const winners = winnerSets.get(activeRounds[ri].key) || new Set();
    const matchUps: SunburstMatchUp[] = [];

    for (let i = 0; i < roundData.length; i += 2) {
      const p1 = roundData[i];
      const p2 = roundData[i + 1];
      const name1 = normalizeName(p1?.player);
      const name2 = normalizeName(p2?.player);

      const winningSide = winners.has(name1) ? 1 : winners.has(name2) ? 2 : undefined;

      // Score for THIS match: the winner's score in the data
      const winnerEntry = winningSide === 1 ? p1 : winningSide === 2 ? p2 : undefined;
      const scoreString = winnerEntry?.score;

      const matchUpStatus = winningSide ? 'COMPLETED' : 'TO_BE_PLAYED';

      matchUps.push({
        roundNumber,
        matchUpStatus,
        winningSide,
        drawPositions: [playerInfoMap.get(name1)?.drawPosition ?? 0, playerInfoMap.get(name2)?.drawPosition ?? 0],
        scoreString,
        sides: [makeSideFromLookup(1, p1, playerInfoMap), makeSideFromLookup(2, p2, playerInfoMap)],
      });
    }
    roundMatchUps[roundNumber] = matchUps;
  }

  return { drawSize, roundMatchUps };
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeName(name: string | undefined): string {
  if (!name) return '';
  const trimmed = name.trim();
  return trimmed.toUpperCase() === 'BYE' ? 'BYE' : trimmed;
}

function mapEntryStatus(entry: string | undefined): string | undefined {
  if (!entry) return undefined;
  return ENTRY_STATUS_MAP[entry.toUpperCase()] || entry;
}

function makeSide(sideNumber: number, player: any | undefined, fallbackPos: number): SunburstSide {
  if (!player) {
    return { sideNumber, drawPosition: fallbackPos };
  }
  const name = normalizeName(player.player);
  return {
    sideNumber,
    drawPosition: player.Draw ?? fallbackPos,
    participantName: name || undefined,
    nationalityCode: player.country || undefined,
    seedNumber: player.seed ? Number(player.seed) : undefined,
    entryStatus: mapEntryStatus(player.entry),
  };
}

function makeSideFromLookup(
  sideNumber: number,
  player: any | undefined,
  lookup: Map<string, { drawPosition: number; country: string; seed?: string | number; entry?: string }>,
): SunburstSide {
  if (!player) {
    return { sideNumber, drawPosition: 0 };
  }
  const name = normalizeName(player.player);
  const info = lookup.get(name);
  return {
    sideNumber,
    drawPosition: info?.drawPosition ?? 0,
    participantName: name || undefined,
    nationalityCode: player.country || info?.country || undefined,
    seedNumber: player.seed ? Number(player.seed) : info?.seed ? Number(info.seed) : undefined,
    entryStatus: mapEntryStatus(player.entry || info?.entry),
  };
}
