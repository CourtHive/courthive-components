/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { seedingBasisMarker, seedingBasisTitle } from './seedingBasis';
import { renderSeeding } from './renderSeeding';

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

describe('renderSeeding', () => {
  const side = (over: any = {}) => ({ seedValue: 9, ...over });

  it('renders an ordinary seed unchanged', () => {
    const el = renderSeeding({ composition: { configuration: { bracketedSeeds: 'square' } } as any, side: side() });
    expect((el as HTMLElement).innerHTML).toEqual('[9]');
    expect((el as HTMLElement).title).toEqual('');
  });

  it('marks an additional seed inside its own brackets and titles it', () => {
    // Inside the brackets so the line does not grow — `[9]` becomes `[9†]`.
    const el = renderSeeding({
      composition: { configuration: { bracketedSeeds: 'square' } } as any,
      side: side({ seedingBasis: 'PROTECTED_RANKING' })
    }) as HTMLElement;
    expect(el.innerHTML).toEqual(`[9${DAGGER}]`);
    expect(el.title).toEqual('Additional seed — protected ranking');
  });

  it('marks without brackets too', () => {
    const el = renderSeeding({
      composition: { configuration: {} } as any,
      side: side({ seedingBasis: 'ORGANISER_DISCRETION' })
    }) as HTMLElement;
    expect(el.innerHTML).toEqual(`9${DAGGER}`);
    expect(el.title).toEqual('Additional seed — organiser discretion');
  });

  it('can be switched off by composition', () => {
    // For a consumer that renders its own explanation elsewhere.
    const el = renderSeeding({
      composition: { configuration: { bracketedSeeds: 'square', seedingBasisMarker: false } } as any,
      side: side({ seedingBasis: 'PROTECTED_RANKING' })
    }) as HTMLElement;
    expect(el.innerHTML).toEqual('[9]');
    expect(el.title).toEqual('');
  });

  it('still returns nothing for an unseeded side', () => {
    // The basis is meaningless without a seed, and a marker alone would be a mark on nothing.
    expect(renderSeeding({ composition: {} as any, side: { seedingBasis: 'PROTECTED_RANKING' } as any })).toEqual('');
  });
});
