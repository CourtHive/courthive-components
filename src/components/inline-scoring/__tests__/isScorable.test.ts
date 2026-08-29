import { describe, it, expect } from 'vitest';

import { isScorable } from '../isScorable';

/**
 * No DOM environment on purpose: `isScorable` is pure. The refusal path of `renderInlineMatchUp` is
 * covered in `renderInlineMatchUp.test.ts`, which already declares one — importing the renderer pulls
 * in a chain reaching `vanillajs-datepicker`, which touches `document` at import time.
 */

const FORMAT = 'SET5-S:6/TB7-F:TB10';
const named = (sideNumber: number, participantName: string) => ({ sideNumber, participant: { participantName } });
const scorable = () =>
  ({ matchUpId: 'mu-1', matchUpFormat: FORMAT, sides: [named(1, 'Alfa'), named(2, 'Bravo')] }) as any;

describe('isScorable', () => {
  it('admits a matchUp with a factory format and two named participants', () => {
    expect(isScorable(scorable())).toBe(true);
  });

  it('REFUSES a matchUp with no matchUpFormat — a score against a guessed format is uninterpretable', () => {
    const withoutFormat = { matchUpId: 'mu-1', sides: [named(1, 'Alfa'), named(2, 'Bravo')] } as any;
    expect(isScorable(withoutFormat)).toBe(false);
    // Control: identical but WITH a format, so the refusal is attributable to the format alone.
    expect(isScorable({ ...withoutFormat, matchUpFormat: FORMAT })).toBe(true);
  });

  it('accepts the matchUpFormat OVERRIDE, mirroring renderInlineMatchUp its parameter', () => {
    const withoutFormat = { matchUpId: 'mu-1', sides: [named(1, 'Alfa'), named(2, 'Bravo')] } as any;
    expect(isScorable(withoutFormat, FORMAT)).toBe(true);
  });

  it('REFUSES unhydrated sides — a participantId alone cannot name anyone', () => {
    const unhydrated = { ...scorable(), sides: [{ sideNumber: 1, participantId: 'p1' }, { sideNumber: 2 }] };
    expect(isScorable(unhydrated)).toBe(false);
  });

  it('REFUSES a participant carrying no usable name', () => {
    expect(isScorable({ ...scorable(), sides: [named(1, '   '), named(2, 'Bravo')] })).toBe(false);
  });

  it('accepts a PAIR named only through its individuals', () => {
    const pair = {
      sideNumber: 1,
      participant: { individualParticipants: [{ participantName: 'Alfa' }, { participantName: 'Charlie' }] },
    };
    expect(isScorable({ ...scorable(), sides: [pair, named(2, 'Bravo')] })).toBe(true);
  });

  it('REFUSES anything that is not exactly two sides', () => {
    expect(isScorable({ ...scorable(), sides: [named(1, 'Alfa')] })).toBe(false);
    expect(isScorable({ ...scorable(), sides: undefined })).toBe(false);
    expect(isScorable(undefined)).toBe(false);
  });
});
