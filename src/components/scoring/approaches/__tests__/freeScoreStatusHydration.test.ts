/**
 * @vitest-environment happy-dom
 *
 * A saved ending that carries no score must still appear in the Free Score field.
 *
 * A walkover has no score by definition — `NO_SCORE_STATUSES` says so and the factory blanks it — so
 * the whole content of that result IS the status. Free Score seeded its field behind
 * `if (internalScore)`, which is false for exactly those statuses, and the field therefore opened
 * EMPTY on a matchUp that was definitely recorded as something. `formatExistingScore` could always
 * render them; the caller never let it.
 *
 * Measured, not inferred: this is why rotating a saved WALKOVER into Free Score showed nothing while
 * building the approach-rotation fix.
 *
 * The assertions are on `input.value` rather than on rendered prose, because the field is the
 * approach's entire input surface — if the text is not there, the operator has nothing to edit and
 * re-submitting writes a result they never saw.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { matchUpStatusConstants } from 'tods-competition-factory';
import { renderFreeScoreEntry } from '../freeScoreApproach';

const {
  COMPLETED,
  TO_BE_PLAYED,
  WALKOVER,
  RETIRED,
  DEFAULTED,
  ABANDONED,
  CANCELLED,
  INCOMPLETE,
  SUSPENDED,
  DEAD_RUBBER
} = matchUpStatusConstants;

const INPUT = '#scoreInputV2';

function mount(matchUp: any) {
  document.body.innerHTML = '';
  const container = document.createElement('div');
  document.body.appendChild(container);
  renderFreeScoreEntry({ matchUp, container, onScoreChange: () => undefined, labels: {} } as any);
  return () => (document.querySelector(INPUT) as HTMLInputElement | null)?.value ?? null;
}

function matchUpWith(over: any = {}) {
  return {
    matchUpId: 'm1',
    matchUpFormat: 'SET3-S:6/TB7',
    sides: [
      { sideNumber: 1, participant: { participantName: 'Alice' } },
      { sideNumber: 2, participant: { participantName: 'Bob' } }
    ],
    ...over
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('Free Score seeds its field from a status that carries no score', () => {
  it('renders a saved walkover as its abbreviation', () => {
    // The case that was empty. `wo` is what the parser accepts back, so the field round-trips.
    const value = mount(matchUpWith({ matchUpStatus: WALKOVER, winningSide: 1 }));
    expect(value()).toBe('wo');
  });

  it.each([
    [ABANDONED, 'ab'],
    [CANCELLED, 'canc'],
    [INCOMPLETE, 'inc'],
    [SUSPENDED, 'susp'],
    [DEAD_RUBBER, 'dr']
  ])('renders a saved %s, which also carries no score', (status, _abbrev) => {
    // Not asserting the exact token for these — `getStatusAbbreviation` owns that mapping and has
    // its own tests. What must hold here is that the field is NOT EMPTY, which is the defect.
    const value = mount(matchUpWith({ matchUpStatus: status }));
    expect(value()).not.toBe('');
    expect(value()).toBeTruthy();
  });
});

describe('Free Score still shows nothing when there is nothing to show', () => {
  it.each([
    ['a match not yet played', { matchUpStatus: TO_BE_PLAYED }],
    ['a completed match with no score object', { matchUpStatus: COMPLETED }],
    ['a matchUp carrying no status at all', {}]
  ])('leaves the field empty for %s', (_label, over) => {
    // The widened gate must not start writing text into an untouched matchUp's field. This is the
    // regression the fix could plausibly have caused, so it is asserted rather than assumed.
    const value = mount(matchUpWith(over));
    expect(value()).toBe('');
  });
});

describe('Free Score keeps rendering a score when there is one', () => {
  it('shows the sets, and appends the ending when both are present', () => {
    const value = mount(
      matchUpWith({
        matchUpStatus: RETIRED,
        winningSide: 1,
        score: { sets: [{ setNumber: 1, side1Score: 6, side2Score: 2, winningSide: 1 }] }
      })
    );
    expect(value()).toContain('6-2');
    expect(value()).toContain('ret');
  });

  it('shows a plain completed score unchanged — the 95% path is untouched', () => {
    const value = mount(
      matchUpWith({
        matchUpStatus: COMPLETED,
        winningSide: 1,
        score: {
          sets: [
            { setNumber: 1, side1Score: 6, side2Score: 4, winningSide: 1 },
            { setNumber: 2, side1Score: 6, side2Score: 3, winningSide: 1 }
          ]
        }
      })
    );
    expect(value()).toBe('6-4 6-3');
  });

  it('a defaulted match with a part-score keeps both halves', () => {
    const value = mount(
      matchUpWith({
        matchUpStatus: DEFAULTED,
        winningSide: 2,
        score: { sets: [{ setNumber: 1, side1Score: 3, side2Score: 1 }] }
      })
    );
    expect(value()).toContain('3-1');
    expect(value()).toContain('def');
  });
});
