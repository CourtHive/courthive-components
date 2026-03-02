/**
 * Preview Generator — Generates SchematicMatchUp[] from node's drawType + drawSize.
 * Pure geometry with feed-round support for non-power-of-2 draw sizes.
 */
import { drawDefinitionConstants } from 'tods-competition-factory';
import type { SchematicMatchUp } from '../../renderSchematicStructure';

const { ROUND_ROBIN, AD_HOC } = drawDefinitionConstants;

let matchUpCounter = 0;

export function generatePreviewMatchUps({
  drawType,
  drawSize,
  stage,
  structureId,
  qualifyingPositions,
}: {
  drawType: string;
  drawSize: number;
  stage?: string;
  structureId?: string;
  qualifyingPositions?: number;
}): SchematicMatchUp[] {
  if (drawType === ROUND_ROBIN) {
    return generateRoundRobinPreview({ drawSize, stage, structureId });
  }
  if (drawType === AD_HOC) {
    return generateAdHocPreview({ drawSize, stage, structureId });
  }
  return generateEliminationPreview({ drawSize, stage, structureId, qualifyingPositions });
}

/**
 * Generates elimination bracket matchUps, including feed rounds for
 * non-power-of-2 draw sizes.
 *
 * For drawSize N where base = 2^floor(log2(N)) and feedIn = N - base:
 *   - Base bracket rounds: [base/2, base/4, ..., 2, 1]
 *   - For each bit k set in feedIn, a feed round of 2^k matchUps is
 *     inserted immediately after the normal round at that level.
 *
 * Examples:
 *   N=16 (base=16, feedIn=0):  [8, 4, 2, 1]
 *   N=17 (base=16, feedIn=1):  [8, 4, 2, 1, 1*]
 *   N=24 (base=16, feedIn=8):  [8, 8*, 4, 2, 1]
 *   N=25 (base=16, feedIn=9):  [8, 8*, 4, 2, 1, 1*]
 *   (* = feed round)
 */
function generateEliminationPreview({
  drawSize,
  stage,
  structureId,
  qualifyingPositions,
}: {
  drawSize: number;
  stage?: string;
  structureId?: string;
  qualifyingPositions?: number;
}): SchematicMatchUp[] {
  const n = Math.max(2, drawSize);
  const base = Math.pow(2, Math.floor(Math.log2(n)));
  const feedIn = n - base;

  // Build round descriptors
  const rounds: { count: number; isFeed: boolean }[] = [];
  let matchCount = base / 2;
  while (matchCount >= 1) {
    rounds.push({ count: matchCount, isFeed: false });
    if (feedIn & matchCount) {
      rounds.push({ count: matchCount, isFeed: true });
    }
    matchCount = Math.floor(matchCount / 2);
  }

  // Truncate for qualifying structures — only show rounds needed to produce qualifiers
  if (qualifyingPositions && qualifyingPositions > 0 && drawSize > qualifyingPositions) {
    const maxRounds = Math.round(Math.log2(drawSize / qualifyingPositions));
    if (maxRounds > 0 && rounds.length > maxRounds) {
      rounds.length = maxRounds;
    }
  }

  const totalRounds = rounds.length;
  const matchUps: SchematicMatchUp[] = [];
  let drawPosCounter = 1;
  let eliminationLevel = 0;

  // Pre-compute which normal rounds precede a feed round
  const precedesFeed = new Set<number>();
  for (let r = 0; r < totalRounds - 1; r++) {
    if (!rounds[r].isFeed && rounds[r + 1].isFeed) {
      precedesFeed.add(r);
    }
  }

  for (let r = 0; r < totalRounds; r++) {
    const { count, isFeed } = rounds[r];
    const roundNumber = r + 1;
    const roundFactor = isFeed
      ? Math.pow(2, Math.max(0, eliminationLevel - 1))
      : Math.pow(2, eliminationLevel);

    // Mark both feed rounds and the normal round immediately before
    // a feed round as preFeedRound so they get m0 (horizontal-only)
    // connectors instead of m1/m2 bracket merge connectors.
    const isPreFeed = isFeed || precedesFeed.has(r);

    for (let pos = 1; pos <= count; pos++) {
      const isFirstNormalRound = roundNumber === 1 && !isFeed;
      matchUps.push({
        matchUpId: `preview-${++matchUpCounter}`,
        roundNumber,
        roundPosition: pos,
        drawPositions: isFirstNormalRound
          ? [(pos - 1) * 2 + 1, (pos - 1) * 2 + 2]
          : isFeed
            ? [drawPosCounter++]
            : [],
        finishingRound: totalRounds - r,
        roundFactor,
        preFeedRound: isPreFeed,
        stage,
        structureId,
      });
    }

    if (!isFeed) eliminationLevel++;
  }

  return matchUps;
}

function generateRoundRobinPreview({
  drawSize,
  stage,
  structureId,
}: {
  drawSize: number;
  stage?: string;
  structureId?: string;
}): SchematicMatchUp[] {
  const matchUps: SchematicMatchUp[] = [];
  const groupSize = Math.min(drawSize, 4);
  const groups = Math.ceil(drawSize / groupSize);
  const roundsPerGroup = groupSize - 1;

  for (let g = 0; g < groups; g++) {
    for (let r = 1; r <= roundsPerGroup; r++) {
      const matchUpsInRound = Math.floor(groupSize / 2);
      for (let pos = 1; pos <= matchUpsInRound; pos++) {
        matchUps.push({
          matchUpId: `preview-${++matchUpCounter}`,
          roundNumber: r,
          roundPosition: g * matchUpsInRound + pos,
          isRoundRobin: true,
          stage,
          structureId: `${structureId}-g${g}`,
        });
      }
    }
  }

  return matchUps;
}

function generateAdHocPreview({
  drawSize,
  stage,
  structureId,
}: {
  drawSize: number;
  stage?: string;
  structureId?: string;
}): SchematicMatchUp[] {
  const matchUps: SchematicMatchUp[] = [];
  const count = Math.max(1, Math.floor(drawSize / 2));

  for (let pos = 1; pos <= count; pos++) {
    matchUps.push({
      matchUpId: `preview-${++matchUpCounter}`,
      roundNumber: 1,
      roundPosition: pos,
      finishingRound: 1,
      stage,
      structureId,
    });
  }

  return matchUps;
}
