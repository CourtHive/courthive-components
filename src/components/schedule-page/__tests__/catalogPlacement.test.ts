import { clampInspectorGeometry } from '../ui/floatingInspector';
import { describe, expect, it } from 'vitest';

/**
 * The floating inspector's geometry rule. Moving the catalog and inspector between placements — the same
 * panel nodes re-parented, the store untouched, the floating window's icon actions and close — is
 * asserted in Chromium by `src/stories/schedule-page/CatalogPlacementTests.stories.ts`.
 */
describe('clampInspectorGeometry', () => {
  it('clamps stale and nonfinite geometry to the viewport', () => {
    expect(clampInspectorGeometry({ left: 9999, top: -10, width: Infinity, height: 9999 }, 800, 600)).toEqual({
      left: 452,
      top: 8,
      width: 340,
      height: 584
    });
  });

  it('fits inside a viewport smaller than the default size', () => {
    const small = clampInspectorGeometry({ width: 500, height: 500 }, 240, 160);
    expect(small.left).toBeGreaterThanOrEqual(0);
    expect(small.top).toBeGreaterThanOrEqual(0);
    expect(small.width + small.left).toBeLessThanOrEqual(240);
    expect(small.height + small.top).toBeLessThanOrEqual(160);
  });
});
