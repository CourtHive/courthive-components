import { getFlightProfileFormItems, SCALE_NAME, SCALE_TYPE } from '../getFlightProfileFormItems';
import { factoryConstants } from 'tods-competition-factory';
import { describe, expect, it } from 'vitest';

const { RATING, RANKING } = factoryConstants.scaleConstants;

/**
 * The Rating System selector offers what the caller gives it (CA 2026-11-17): TMX gives the systems its participants
 * hold, so a pool rated only by UTR is not offered WTN — nor defaulted to it.
 */
const item = (items: any[], field: string) => items.find((i) => i.field === field);

describe('getFlightProfileFormItems ratingTypes', () => {
  it('offers every rating system when the caller does not say', () => {
    const systems = item(getFlightProfileFormItems(), SCALE_NAME).options.map((o: any) => o.value);
    expect(systems).toEqual(['WTN', 'UTR', 'TRN', 'NTRP', 'DUPR']);
  });

  it('offers only the given systems, and selects the first when WTN is not among them', () => {
    const items = getFlightProfileFormItems({ editorConfig: { options: { ratingTypes: ['UTR', 'DUPR'] } } });
    const scaleName = item(items, SCALE_NAME);
    expect(scaleName.options.map((o: any) => o.value)).toEqual(['UTR', 'DUPR']);
    expect(scaleName.value).toBe('UTR');
    expect(scaleName.options.find((o: any) => o.selected)?.value).toBe('UTR');
  });

  it('with no system present, disables the Rating strategy and flights by ranking', () => {
    const items = getFlightProfileFormItems({ editorConfig: { options: { ratingTypes: [] } } });
    const scaleType = item(items, SCALE_TYPE);
    const rating = scaleType.options.find((o: any) => o.value === RATING);
    expect(rating).toMatchObject({ disabled: true, label: 'Rating (no ratings present)' });
    expect(scaleType.value).toBe(RANKING);
    expect(item(items, SCALE_NAME).visible).toBe(false);
  });
});
