import { anchoredInspectorGeometry, clampInspectorGeometry } from '../ui/floatingInspector';
import { describe, expect, it } from 'vitest';

/**
 * A floating panel with no remembered place opens in its host's area: the topology builder's canvas, which sits below
 * the builder's toolbar wherever the host puts the builder. Opened at the window's default it covered Generate Draw.
 */
describe('anchoredInspectorGeometry', () => {
  const canvas = { top: 240, right: 1030, bottom: 680 };

  it('opens at the area top right, below whatever sits above the area', () => {
    expect(anchoredInspectorGeometry({ width: 340, height: 380 }, canvas, 1280, 720)).toEqual({
      width: 340,
      height: 380,
      top: 248,
      left: 682
    });
  });

  it('is no taller than the area', () => {
    expect(anchoredInspectorGeometry({ width: 340, height: 560 }, canvas, 1280, 720).height).toBe(424);
  });

  it('keeps its own height when the area has too little room to hold a panel', () => {
    const geometry = anchoredInspectorGeometry(
      { width: 340, height: 300 },
      { top: 600, right: 1030, bottom: 700 },
      1280,
      720
    );
    expect(geometry.height).toBe(300);
    expect(geometry.top + geometry.height).toBeLessThanOrEqual(712);
  });

  it('without an area, opens where the window default puts it', () => {
    expect(anchoredInspectorGeometry({ width: 340 }, undefined, 1280, 720)).toEqual(
      clampInspectorGeometry({ width: 340 }, 1280, 720)
    );
  });
});
