import { buildVenueTreeModel, courtVisibilityKey, resolveVisibleCourts } from './venueTreeModel';
import { describe, expect, it } from 'vitest';

/**
 * The venue tree's checkbox state, which `AvailabilityGrid.updateVenueTree` renders as `checked`. It used
 * to be computed inline in that method and tested through `Object.create(AvailabilityGrid.prototype)`.
 */
const ref = (venueId: string, courtId: string) => ({ tournamentId: 't1', venueId, courtId });
const court = (venueId: string, courtId: string, name = courtId) =>
  ({ ref: ref(venueId, courtId), name, surface: 'hard', indoor: false, hasLights: false, tags: [] }) as any;

const checkedOf = (model: ReturnType<typeof buildVenueTreeModel>) =>
  model.map((venue) => [venue.venueId, venue.checked, venue.courts.map((c) => [c.meta.ref.courtId, c.checked])]);

describe('venue tree visibility', () => {
  it('initializes newly arrived courts after an empty render, retaining explicit empty selections', () => {
    // First render: the engine lists no courts yet.
    let visible = resolveVisibleCourts([], new Set(), false);
    expect(visible).toEqual(new Set());

    // Courts arrive; visibility was never customised, so they are visible and checked.
    const courts = [court('v1', 'c1', 'One')];
    visible = resolveVisibleCourts(courts, visible, false);
    expect(checkedOf(buildVenueTreeModel(courts, visible))).toEqual([['v1', true, [['c1', true]]]]);

    // The user unchecks everything: an explicit EMPTY selection, which must not snap back to "all".
    const empty = new Set<string>();
    visible = resolveVisibleCourts(courts, empty, true);
    expect(visible).toBe(empty);
    expect(checkedOf(buildVenueTreeModel(courts, visible))).toEqual([['v1', false, [['c1', false]]]]);
  });

  it('checks a venue only when every one of its courts is visible', () => {
    const courts = [court('v1', 'c1'), court('v1', 'c2'), court('v2', 'c3')];
    const visible = new Set([courtVisibilityKey(ref('v1', 'c1')), courtVisibilityKey(ref('v2', 'c3'))]);
    expect(checkedOf(buildVenueTreeModel(courts, visible))).toEqual([
      [
        'v1',
        false,
        [
          ['c1', true],
          ['c2', false]
        ]
      ],
      ['v2', true, [['c3', true]]]
    ]);
  });

  it('names a venue from the record, falling back to its id', () => {
    const model = buildVenueTreeModel([court('v1', 'c1'), court('v2', 'c2')], new Set(), new Map([['v1', 'Centre']]));
    expect(model.map((venue) => venue.venueName)).toEqual(['Centre', 'v2']);
  });

  it('keys a court in the controller resource-id format', () => {
    expect(courtVisibilityKey(ref('v1', 'c1'))).toBe('t1|v1|c1');
  });
});
