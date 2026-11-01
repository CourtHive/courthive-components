import { dualIssues, issueMessage, lineIssues, type ScorecardIssue } from '../dualIssues';
import { describe, expect, it } from 'vitest';

const issues: ScorecardIssue[] = [
  { code: 'LINEUP_INCOMPLETE', matchUpId: 's1', collectionId: 'S', sideNumber: 2 },
  { code: 'DUPLICATE_IN_COLLECTION', matchUpIds: ['s1', 's2'], collectionId: 'S', participantIds: ['p'] },
  { code: 'MISSING_REASON', matchUpId: 'd1', collectionId: 'D', info: 'RETIRED' },
  { code: 'DUAL_DECIDED', matchUpIds: ['d1', 'd2'] },
  { code: 'MANUAL_SCORE' },
  { code: 'MANUAL_SCORE_DIVERGES', info: '1-0' }
];

describe('dual issues', () => {
  it('line issues go to the lines they name; a duplicate to each of its lines', () => {
    const byLine = lineIssues(issues, ['s1', 's2', 's3']);
    expect(byLine.get('s1')?.map(({ code }) => code)).toEqual(['LINEUP_INCOMPLETE', 'DUPLICATE_IN_COLLECTION']);
    expect(byLine.get('s2')?.map(({ code }) => code)).toEqual(['DUPLICATE_IN_COLLECTION']);
    expect(byLine.has('s3')).toBe(false);
    // a dual issue naming lines is not a line's issue
    expect(lineIssues(issues, ['d2']).size).toBe(0);
    expect(lineIssues(undefined, ['s1']).size).toBe(0);
  });

  it('dual issues are the banner', () => {
    expect(dualIssues(issues).map(({ code }) => code)).toEqual([
      'DUAL_DECIDED',
      'MANUAL_SCORE',
      'MANUAL_SCORE_DIVERGES'
    ]);
    expect(dualIssues()).toEqual([]);
  });

  it('messages: defaults, a caller override, an unknown code, and the divergence names the lines score', () => {
    expect(issueMessage(issues[0])).toBe('Line-up incomplete');
    expect(issueMessage(issues[0], { LINEUP_INCOMPLETE: 'Composition incomplète' })).toBe('Composition incomplète');
    expect(issueMessage({ code: 'SOMETHING_NEW' })).toBe('SOMETHING_NEW');
    expect(issueMessage(issues[5])).toBe('The lines produce 1-0');
  });
});
