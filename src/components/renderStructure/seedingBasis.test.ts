import { seedingBasisMarker, seedingBasisTitle } from './seedingBasis';
import { describe, it, expect } from 'vitest';

const DAGGER = '†';

describe('seedingBasisMarker', () => {
  it('marks nothing without a basis', () => {
    expect(seedingBasisMarker(undefined)).toEqual('');
  });

  it('treats RANKING as ordinary', () => {
    // An ABSENT basis means RANKING. A record stating it explicitly means the same thing, and
    // marking it would bury the seed that is genuinely unusual.
    expect(seedingBasisMarker('RANKING')).toEqual('');
    expect(seedingBasisTitle('RANKING')).toBeUndefined();
  });

  it('marks a non-ordinary basis and names it on hover', () => {
    expect(seedingBasisMarker('PROTECTED_RANKING')).toEqual(DAGGER);
    expect(seedingBasisTitle('PROTECTED_RANKING')).toEqual('Additional seed — protected ranking');
  });

  it('prints an unrecognised basis rather than dropping it', () => {
    expect(seedingBasisTitle('SOME_NEW_BASIS')).toEqual('Additional seed — some_new_basis');
  });
});

// What `renderSeeding` does with these — the marker inside the brackets or without them, the title,
// `seedingBasisMarker: false` and an unseeded side — is asserted in a browser by
// `seedingBasis.stories.ts` (SeedingBasis, SeedingBasisEdges).
