/**
 * The result band: what the card says it is about to submit, before it is submitted.
 *
 * The design gives this a whole band of its own for one reason — a score being DISCARDED must be
 * stated rather than discovered. Choosing Cancelled or Dead Rubber throws away a part-score the
 * operator typed; the old dialog did that silently, and the only way to find out was to reopen the
 * match. So the band is not decoration, it is the confirmation step, and its wording is therefore
 * logic rather than markup: pure, and tested in CI rather than looked at.
 *
 * `tone` drives the band's colour, and the three tones mean different things:
 *
 *   good     — a result that will advance somebody, or a complete score
 *   warn     — something is being thrown away, or nobody advances from a match that was played
 *   neutral  — nothing to say yet
 *
 * No DOM, no side effects, no locale lookups of its own: every label arrives already resolved, so a
 * caller that has locale strings can pass them and a caller that does not gets English.
 */

import { NON_DIRECTING_ENDINGS, doubleExitWarning, endingLabels } from './irregularEnding';
import { matchUpStatusConstants } from 'tods-competition-factory';

import type { ScoreEntryResolution } from './scoreEntryState';

const { DOUBLE_WALKOVER, WALKOVER, DEFAULTED } = matchUpStatusConstants;

export type ResultTone = 'good' | 'warn' | 'neutral';

export type ResultBand = {
  tone: ResultTone;
  /** The main sentence. Always present — a band with no headline would be a band with no purpose. */
  headline: string;
  /** The quieter right-hand note: what happens next, or what was recorded. */
  detail?: string;
};

export type SummaryParams = {
  resolution: ScoreEntryResolution;
  /** Side 1's name first. */
  sideNames: [string, string];
  /** The score as it currently stands, already formatted (e.g. `'6-4 2-1'`). */
  scoreString?: string;
  /** Whether that score is a finished result — the score region's judgement, not this module's. */
  scoreComplete?: boolean;
  /** The winner a complete score implies, when no ending overrides it. */
  scoreWinningSide?: 1 | 2;
  /** Display labels for endings, so a locale can supply them. Defaults to English. */
  labels?: Record<string, string>;
  /** The chosen reason code's display form, e.g. `'Wo [inj]'`. */
  reasonDisplay?: string;
  /** What the winner advances to, e.g. `'the quarter-final'`. Omitted when unknown. */
  advancesTo?: string;
};

/** The band for the current state of the card. */
export function scoreEntrySummary(params: SummaryParams): ResultBand {
  const { resolution, sideNames, scoreString, scoreComplete, scoreWinningSide, reasonDisplay, advancesTo } = params;
  const labels = params.labels ?? endingLabels();
  const name = (side: 1 | 2) => sideNames[side - 1];
  const label = (status: string) => labels[status] ?? status;

  // ── Nothing chosen: fall back to what the score alone says ──
  if (!resolution.hasEnding) {
    if (scoreComplete && scoreWinningSide) {
      return {
        tone: 'good',
        headline: `${name(scoreWinningSide)} def. ${name(other(scoreWinningSide))} ${scoreString ?? ''}`.trim(),
        detail: advancesTo ? `advances to ${advancesTo}` : undefined,
      };
    }
    // An incomplete score is not an error — it is a match in progress, which is a legitimate thing to
    // record. Saying "no result yet" rather than warning keeps the band from crying wolf on the most
    // common state the dialog is ever in.
    return {
      tone: 'neutral',
      headline: scoreString ? `${scoreString} — not a finished result` : 'No result entered yet',
    };
  }

  const status = resolution.matchUpStatus;
  if (!status) return { tone: 'neutral', headline: 'No result entered yet' };

  // ── A double exit: nobody advances, and it propagates ──
  if (resolution.isDoubleExit) {
    // The wording comes from `doubleExitWarning`, which already exists for exactly this and is keyed
    // on the BASE ending. Re-deriving the sentence here would give the card its own copy of a warning
    // the inline popover already shows, and the two would drift.
    const base = status === DOUBLE_WALKOVER ? WALKOVER : DEFAULTED;

    // The REASON leads, as it does in every other branch. This returned only the propagation warning
    // until 2026-09-29, so a reason chosen for a double walkover was recorded, round-tripped correctly,
    // and never shown — the one ending whose reason the operator could not see they had entered. The
    // warning stays, after it: what propagates is the more consequential half of the sentence.
    return {
      tone: 'warn',
      headline: `${label(status)} — neither side advances`,
      detail: joinDetail([reasonDisplay, doubleExitWarning(base)]),
    };
  }

  // ── An ending that names a winner ──
  // Narrowed explicitly rather than cast: `winningSide` is `number` on the resolution, and coercing
  // anything-not-1 to side 2 would name the wrong participant for a value that should have been
  // rejected. An out-of-range side falls through to the guard at the end instead.
  const winner = resolution.winningSide === 1 || resolution.winningSide === 2 ? resolution.winningSide : undefined;
  if (winner) {
    return {
      tone: 'good',
      headline: `${label(status)} — ${name(winner)} advances`,
      detail: joinDetail([reasonDisplay, resolution.clearsScore ? 'no score recorded' : scoreString]),
    };
  }

  // ── A match-level ending. The one case that must announce a loss of data ──
  if (resolution.clearsScore && scoreString) {
    return {
      tone: 'warn',
      headline: `${label(status)} — the part-score of ${scoreString} has been cleared`,
      detail: 'nobody advances',
    };
  }

  if (NON_DIRECTING_ENDINGS.has(status)) {
    return {
      tone: scoreString ? 'good' : 'neutral',
      headline: scoreString ? `${label(status)} — ${scoreString} recorded` : label(status),
      detail: joinDetail([reasonDisplay, 'nobody advances']),
    };
  }

  // A winner-requiring ending with no winner. `resolveScoreEntry` cannot produce this — an ending is
  // chosen ON a side — but the band must not go blank if it ever does, because a blank band reads as
  // "nothing will happen" beside a live Submit button.
  return { tone: 'warn', headline: `${label(status)} — no winner yet`, detail: 'not ready to submit' };
}

function other(side: 1 | 2): 1 | 2 {
  return side === 1 ? 2 : 1;
}

/** Join the present parts of a detail line with the separator the design uses. */
function joinDetail(parts: (string | undefined)[]): string | undefined {
  const present = parts.filter((part): part is string => !!part);
  return present.length ? present.join(' · ') : undefined;
}
