/**
 * Shared dial pad logic - formats raw digits into score string
 * Parses matchUpFormat to determine boundaries
 */

import { matchUpFormatCode } from 'tods-competition-factory';

export type FormatOptions = {
  matchUpFormat: string;
};

/**
 * Convert raw digits to formatted score string
 * Example: "6464" with matchUpFormat 'SET3-S:6/TB7' becomes "6-4 6-4"
 */
export function formatScoreString(digits: string, options: FormatOptions): string {
  const { matchUpFormat } = options;

  if (!digits) return '';

  const parsedFormat = matchUpFormatCode.parse(matchUpFormat);
  const bestOf = parsedFormat?.setFormat?.bestOf || 3;

  const getSetFormat = (setNumber: number) => {
    const isDecidingSet = setNumber === bestOf;
    return isDecidingSet && parsedFormat?.finalSetFormat ? parsedFormat.finalSetFormat : parsedFormat?.setFormat;
  };

  let result = '';
  let setCount = 0;

  const segments = digits.split(/[\s/]+|--+/).filter((s) => s.length > 0);

  for (const segment of segments) {
    const parseState = { pos: 0 };

    while (parseState.pos < segment.length && setCount < bestOf) {
      const setResult = parseOneSet(segment, parseState, setCount, bestOf, getSetFormat);

      if (result) result += ' ';
      result += setResult.formatted;

      if (setResult.complete) {
        setCount++;
      } else {
        break;
      }
    }
  }

  return result;
}

interface SetParseResult {
  formatted: string;
  complete: boolean;
}

function getSetConfig(setCount: number, bestOf: number, getSetFormat: (n: number) => any) {
  const currentSetFormat = getSetFormat(setCount + 1);
  const tiebreakSetTo = currentSetFormat?.tiebreakSet?.tiebreakTo;
  const regularSetTo = currentSetFormat?.setTo;
  const isTiebreakOnly = !!tiebreakSetTo && !regularSetTo;
  const isTimed = currentSetFormat?.timed === true;
  const setTo = isTimed ? 999 : tiebreakSetTo || regularSetTo || 6;
  const tiebreakAt = currentSetFormat?.tiebreakAt || setTo;
  const maxScore = isTimed ? 999 : setTo + 1;

  return { isTiebreakOnly, isTimed, setTo, tiebreakAt, maxScore };
}

function parseSideDigits(
  segment: string,
  parseState: { pos: number },
  isFreeForm: boolean,
  maxScore: number,
  maxOvershoot: number
): string {
  let side = '';
  while (parseState.pos < segment.length) {
    const ch = segment[parseState.pos];

    if (ch === '-') {
      if (!isFreeForm) break;
      if (side.length > 0) {
        parseState.pos++;
        break;
      }
      break;
    }

    if (isFreeForm) {
      side += ch;
      parseState.pos++;
      continue;
    }

    const val = Number.parseInt(side + ch);
    if (val > maxScore + maxOvershoot) break;
    if (side.length >= 2) break;

    side += ch;
    parseState.pos++;

    const currentVal = Number.parseInt(side);
    if (side.length === 1 && currentVal !== 1 && maxScore < 10) {
      if (parseState.pos < segment.length && segment[parseState.pos] === '-') {
        continue;
      }
      break;
    }
  }
  return side;
}

function coerceScores(
  s1: number,
  s2: number,
  setTo: number
): { s1: number; s2: number; side1: string; side2: string; wasCoerced: boolean } {
  let wasCoerced = false;
  let cs1 = s1;
  let cs2 = s2;

  if (cs1 > setTo + 1) {
    cs1 = setTo;
    wasCoerced = true;
  }
  if (cs2 > setTo + 1) {
    cs2 = setTo;
    wasCoerced = true;
  }

  if (cs1 === setTo + 1 && cs2 < setTo - 1) {
    cs1 = setTo;
    wasCoerced = true;
  } else if (cs2 === setTo + 1 && cs1 < setTo - 1) {
    cs2 = setTo;
    wasCoerced = true;
  }

  return { s1: cs1, s2: cs2, side1: cs1.toString(), side2: cs2.toString(), wasCoerced };
}

function parseTiebreakDigits(segment: string, parseState: { pos: number }): string {
  let tb = '';
  while (parseState.pos < segment.length) {
    const ch = segment[parseState.pos];
    if (ch === '-') {
      parseState.pos++;
      break;
    }
    tb += ch;
    parseState.pos++;
  }
  return tb;
}

function parseOneSet(
  segment: string,
  parseState: { pos: number },
  setCount: number,
  bestOf: number,
  getSetFormat: (n: number) => any
): SetParseResult {
  const config = getSetConfig(setCount, bestOf, getSetFormat);
  const isFreeForm = config.isTiebreakOnly || config.isTimed;

  // Parse side1
  const side1Raw = parseSideDigits(segment, parseState, isFreeForm, config.maxScore, 0);

  // Consume minus separator between sides
  if (parseState.pos < segment.length && segment[parseState.pos] === '-') {
    parseState.pos++;
  }

  // Parse side2
  const side2Raw = parseSideDigits(segment, parseState, isFreeForm, config.maxScore, 3);

  if (!side2Raw) {
    return { formatted: side1Raw, complete: false };
  }

  let s1 = Number.parseInt(side1Raw);
  let s2 = Number.parseInt(side2Raw);
  let side1 = side1Raw;
  let side2 = side2Raw;
  let wasCoerced = false;

  if (!config.isTiebreakOnly && !config.isTimed) {
    const coerced = coerceScores(s1, s2, config.setTo);
    s1 = coerced.s1;
    s2 = coerced.s2;
    side1 = coerced.side1;
    side2 = coerced.side2;
    wasCoerced = coerced.wasCoerced;
  }

  const scoreDiff = Math.abs(s1 - s2);
  const highScore = Math.max(s1, s2);
  const hasWinner = config.isTimed || (highScore >= config.setTo && scoreDiff >= 2);

  const remainingDigitsExist = parseState.pos < segment.length;
  const scoresTied = s1 === config.tiebreakAt && s2 === config.tiebreakAt;
  const scoresOneApart =
    (s1 === config.tiebreakAt + 1 && s2 === config.tiebreakAt) ||
    (s2 === config.tiebreakAt + 1 && s1 === config.tiebreakAt);
  const needsTiebreak = !wasCoerced && (scoresTied || (scoresOneApart && remainingDigitsExist));

  if (needsTiebreak) {
    const tb1 = parseTiebreakDigits(segment, parseState);
    if (tb1) {
      return { formatted: `${side1}-${side2}(${tb1})`, complete: true };
    }
    return { formatted: `${side1}-${side2}(`, complete: false };
  }

  if (config.isTiebreakOnly) {
    return { formatted: `[${side1}-${side2}]`, complete: hasWinner };
  }

  return { formatted: `${side1}-${side2}`, complete: hasWinner };
}
