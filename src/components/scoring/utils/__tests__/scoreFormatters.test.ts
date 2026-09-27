/**
 * Test suite for score formatting utilities
 *
 * Tests formatExistingScore() and getStatusAbbreviation() functions
 * that are used to display existing scores in text input fields.
 */

import { describe, it, expect } from 'vitest';
import { formatExistingScore, getStatusAbbreviation } from '../scoreFormatters';
import { SELECTABLE_ENDINGS } from '../../logic/irregularEnding';
import { parseScore } from '../../../../tools/freeScore/freeScore';
import { matchUpStatusConstants } from 'tods-competition-factory';

const { WALKOVER, ABANDONED } = matchUpStatusConstants;

describe('scoreFormatters', () => {
  describe('getStatusAbbreviation', () => {
    it('should return correct abbreviations for known statuses', () => {
      expect(getStatusAbbreviation('RETIRED')).toBe('ret');
      expect(getStatusAbbreviation('WALKOVER')).toBe('wo');
      expect(getStatusAbbreviation('DEFAULTED')).toBe('def');
      expect(getStatusAbbreviation('SUSPENDED')).toBe('susp');
      expect(getStatusAbbreviation('CANCELLED')).toBe('canc');
      expect(getStatusAbbreviation('INCOMPLETE')).toBe('inc');
      expect(getStatusAbbreviation('DEAD_RUBBER')).toBe('dr');
      expect(getStatusAbbreviation('IN_PROGRESS')).toBe('in');
      expect(getStatusAbbreviation('AWAITING_RESULT')).toBe('await');
    });

    it('should return empty string for unknown statuses', () => {
      expect(getStatusAbbreviation('UNKNOWN_STATUS')).toBe('');
      expect(getStatusAbbreviation('TO_BE_PLAYED')).toBe('');
      expect(getStatusAbbreviation('COMPLETED')).toBe('');
      expect(getStatusAbbreviation('SOMETHING_NEW')).toBe('');
    });

    it('should return empty string for empty input', () => {
      expect(getStatusAbbreviation('')).toBe('');
    });
  });

  describe('formatExistingScore', () => {
    describe('Basic Score Formatting', () => {
      it('should format simple 2-set match', () => {
        const scoreObject = {
          sets: [
            { side1Score: 6, side2Score: 4, winningSide: 1 },
            { side1Score: 6, side2Score: 3, winningSide: 1 }
          ]
        };
        expect(formatExistingScore(scoreObject)).toBe('6-4 6-3');
      });

      it('should format 3-set match', () => {
        const scoreObject = {
          sets: [
            { side1Score: 6, side2Score: 4, winningSide: 1 },
            { side1Score: 4, side2Score: 6, winningSide: 2 },
            { side1Score: 6, side2Score: 3, winningSide: 1 }
          ]
        };
        expect(formatExistingScore(scoreObject)).toBe('6-4 4-6 6-3');
      });

      it('should handle 0 scores', () => {
        const scoreObject = {
          sets: [
            { side1Score: 6, side2Score: 0, winningSide: 1 },
            { side1Score: 6, side2Score: 1, winningSide: 1 }
          ]
        };
        expect(formatExistingScore(scoreObject)).toBe('6-0 6-1');
      });
    });

    describe('Tiebreak Formatting', () => {
      it('should format tiebreak when side1 wins set', () => {
        const scoreObject = {
          sets: [
            {
              side1Score: 7,
              side2Score: 6,
              winningSide: 1,
              side1TiebreakScore: 7,
              side2TiebreakScore: 3
            }
          ]
        };
        expect(formatExistingScore(scoreObject)).toBe('7-6(3)');
      });

      it('should format tiebreak when side2 wins set', () => {
        const scoreObject = {
          sets: [
            {
              side1Score: 6,
              side2Score: 7,
              winningSide: 2,
              side1TiebreakScore: 3,
              side2TiebreakScore: 7
            }
          ]
        };
        expect(formatExistingScore(scoreObject)).toBe('6-7(3)');
      });

      it('should format multiple sets with tiebreaks', () => {
        const scoreObject = {
          sets: [
            {
              side1Score: 7,
              side2Score: 6,
              winningSide: 1,
              side1TiebreakScore: 7,
              side2TiebreakScore: 5
            },
            {
              side1Score: 6,
              side2Score: 7,
              winningSide: 2,
              side1TiebreakScore: 8,
              side2TiebreakScore: 10
            },
            { side1Score: 6, side2Score: 4, winningSide: 1 }
          ]
        };
        expect(formatExistingScore(scoreObject)).toBe('7-6(5) 6-7(8) 6-4');
      });

      it('should format extended tiebreak scores', () => {
        const scoreObject = {
          sets: [
            {
              side1Score: 7,
              side2Score: 6,
              winningSide: 1,
              side1TiebreakScore: 102,
              side2TiebreakScore: 100
            }
          ]
        };
        expect(formatExistingScore(scoreObject)).toBe('7-6(100)');
      });
    });

    describe('Status Handling', () => {
      it('should append status abbreviation for RETIRED', () => {
        const scoreObject = {
          sets: [
            { side1Score: 6, side2Score: 4, winningSide: 1 },
            { side1Score: 3, side2Score: 4, winningSide: undefined }
          ]
        };
        expect(formatExistingScore(scoreObject, 'RETIRED')).toBe('6-4 3-4 ret');
      });

      it('should append status abbreviation for WALKOVER', () => {
        const scoreObject = { sets: [] };
        expect(formatExistingScore(scoreObject, 'WALKOVER')).toBe('wo');
      });

      it('should append status abbreviation for DEFAULTED', () => {
        const scoreObject = {
          sets: [{ side1Score: 6, side2Score: 4, winningSide: 1 }]
        };
        expect(formatExistingScore(scoreObject, 'DEFAULTED')).toBe('6-4 def');
      });

      it('should NOT append status for COMPLETED', () => {
        const scoreObject = {
          sets: [
            { side1Score: 6, side2Score: 4, winningSide: 1 },
            { side1Score: 6, side2Score: 3, winningSide: 1 }
          ]
        };
        expect(formatExistingScore(scoreObject, 'COMPLETED')).toBe('6-4 6-3');
      });

      it('should NOT append status for TO_BE_PLAYED', () => {
        const scoreObject = { sets: [] };
        expect(formatExistingScore(scoreObject, 'TO_BE_PLAYED')).toBe('');
      });

      it('should NOT append unknown status', () => {
        const scoreObject = {
          sets: [{ side1Score: 6, side2Score: 4, winningSide: 1 }]
        };
        expect(formatExistingScore(scoreObject, 'UNKNOWN_STATUS')).toBe('6-4');
      });
    });

    describe('Edge Cases', () => {
      it('should return empty string for null scoreObject', () => {
        expect(formatExistingScore(null)).toBe('');
      });

      it('should return empty string for undefined scoreObject', () => {
        expect(formatExistingScore(undefined)).toBe('');
      });

      it('should return empty string for scoreObject without sets', () => {
        expect(formatExistingScore({})).toBe('');
      });

      it('should return empty string for empty sets array', () => {
        const scoreObject = { sets: [] };
        expect(formatExistingScore(scoreObject)).toBe('');
      });

      it('should handle sets with undefined scores', () => {
        const scoreObject = {
          sets: [{ side1Score: undefined, side2Score: undefined, winningSide: undefined }]
        };
        expect(formatExistingScore(scoreObject)).toBe('0-0');
      });

      it('should handle sets with null scores', () => {
        const scoreObject = {
          sets: [{ side1Score: null, side2Score: null, winningSide: null }]
        };
        expect(formatExistingScore(scoreObject)).toBe('0-0');
      });

      it('should handle mixed complete and incomplete sets', () => {
        const scoreObject = {
          sets: [
            { side1Score: 6, side2Score: 4, winningSide: 1 },
            { side1Score: 3, side2Score: 2, winningSide: undefined }
          ]
        };
        expect(formatExistingScore(scoreObject)).toBe('6-4 3-2');
      });

      it('should handle tiebreak with undefined losing side score', () => {
        const scoreObject = {
          sets: [
            {
              side1Score: 7,
              side2Score: 6,
              winningSide: 1,
              side1TiebreakScore: 7,
              side2TiebreakScore: undefined
            }
          ]
        };
        // Should show (undefined) if losing side's tiebreak score is undefined
        expect(formatExistingScore(scoreObject)).toBe('7-6(undefined)');
      });
    });

    describe('Integration: Real World Scenarios', () => {
      it('should format complete best-of-3 match', () => {
        const scoreObject = {
          sets: [
            { side1Score: 6, side2Score: 4, winningSide: 1 },
            { side1Score: 3, side2Score: 6, winningSide: 2 },
            {
              side1Score: 7,
              side2Score: 6,
              winningSide: 1,
              side1TiebreakScore: 7,
              side2TiebreakScore: 5
            }
          ]
        };
        expect(formatExistingScore(scoreObject, 'COMPLETED')).toBe('6-4 3-6 7-6(5)');
      });

      it('should format retired match with partial score', () => {
        const scoreObject = {
          sets: [
            { side1Score: 6, side2Score: 4, winningSide: 1 },
            { side1Score: 2, side2Score: 3, winningSide: undefined }
          ]
        };
        expect(formatExistingScore(scoreObject, 'RETIRED')).toBe('6-4 2-3 ret');
      });

      it('should format walkover with no sets', () => {
        const scoreObject = { sets: [] };
        expect(formatExistingScore(scoreObject, 'WALKOVER')).toBe('wo');
      });

      it('should format defaulted match with partial score', () => {
        const scoreObject = {
          sets: [
            { side1Score: 6, side2Score: 7, winningSide: 2, side1TiebreakScore: 5, side2TiebreakScore: 7 },
            { side1Score: 5, side2Score: 4, winningSide: undefined }
          ]
        };
        expect(formatExistingScore(scoreObject, 'DEFAULTED')).toBe('6-7(5) 5-4 def');
      });

      it('should format suspended match', () => {
        const scoreObject = {
          sets: [
            { side1Score: 6, side2Score: 4, winningSide: 1 },
            { side1Score: 4, side2Score: 6, winningSide: 2 },
            { side1Score: 3, side2Score: 3, winningSide: undefined }
          ]
        };
        expect(formatExistingScore(scoreObject, 'SUSPENDED')).toBe('6-4 4-6 3-3 susp');
      });
    });
  });
});

/**
 * The formatter and the Free Score parser have to agree, because together they are a round trip: a
 * saved result is FORMATTED into the field, and whatever is in the field is PARSED back on the next
 * keystroke. A disagreement is silent and it changes the recorded result.
 *
 * They did disagree. `ABANDONED` was absent from the abbreviation map while the parser accepted
 * `ab` / `aband` / `abandoned` for it — so an abandonment could be typed in and never read back, and
 * a saved one opened Free Score with an empty field. The near-miss is worse than the gap: the parser
 * anchors AWAITING_RESULT on a bare `a`, so abbreviating abandonment as `a` would have formatted a
 * result that parses back as a DIFFERENT status.
 *
 * So this is a table over the vocabulary rather than a case per status — the point is that no status
 * can be added to one side without the other.
 */
describe('every abbreviation parses back to the status it was formatted from', () => {
  const FORMAT = 'SET3-S:6/TB7';

  const abbreviated = SELECTABLE_ENDINGS.map((status) => ({
    status,
    abbrev: getStatusAbbreviation(status)
  }));

  it('every selectable ending HAS an abbreviation — the gap ABANDONED fell through', () => {
    const missing = abbreviated.filter((entry) => !entry.abbrev).map((entry) => entry.status);
    expect(missing, `no Free Score abbreviation for: ${missing.join(', ')}`).toEqual([]);
  });

  it.each(abbreviated)('$abbrev round-trips to $status', ({ status, abbrev }) => {
    // The formatter's own output, fed to the parser. If these disagree the field silently rewrites
    // the result the moment the operator touches it.
    expect(abbrev).toBeTruthy();
    const parsed: any = parseScore(abbrev, FORMAT);
    expect(parsed.matchUpStatus).toBe(status);
  });

  it('a status-only format produces exactly the abbreviation, with no stray score', () => {
    // What a walkover looks like in the field: the token alone. A leading "0-0" would parse as a set.
    expect(formatExistingScore(undefined, WALKOVER)).toBe('wo');
    expect(formatExistingScore(undefined, ABANDONED)).toBe('ab');
  });
});
