import { describe, expect, it } from 'vitest';

import { mergeFederationIds } from '../buildHiveIDLogin';

const BOBOCA = { provider: 'BOBOCA', externalId: 'X' };

describe('mergeFederationIds', () => {
  it('returns undefined when there is nothing to send (name-only signup stays name-only)', () => {
    expect(mergeFederationIds(null)).toBeUndefined();
    expect(mergeFederationIds(null, [])).toBeUndefined();
  });

  it('includes an entered id', () => {
    expect(mergeFederationIds(BOBOCA)).toEqual([BOBOCA]);
  });

  it('merges consumer config with the entered id', () => {
    expect(mergeFederationIds(BOBOCA, [{ provider: 'USTA', externalId: 'Y' }])).toEqual([
      { provider: 'USTA', externalId: 'Y' },
      BOBOCA,
    ]);
  });

  it('de-dupes by provider::externalId', () => {
    expect(mergeFederationIds(BOBOCA, [BOBOCA])).toEqual([BOBOCA]);
  });

  it('drops incomplete entries (blank provider or externalId)', () => {
    expect(mergeFederationIds({ provider: 'BOBOCA', externalId: '' })).toBeUndefined();
    expect(mergeFederationIds(null, [{ provider: '', externalId: 'X' } as any])).toBeUndefined();
  });
});
