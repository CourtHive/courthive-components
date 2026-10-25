import { applyThemePalette, getThemePalettes, resolveThemePalette } from './palettes';
import { describe, expect, it } from 'vitest';

describe('theme palettes', () => {
  it('lists palettes per mode', () => {
    expect(getThemePalettes('light').map((p) => p.id)).toEqual(['courtside', 'linen', 'slate']);
    expect(getThemePalettes('dark').map((p) => p.id)).toEqual(['midnight', 'graphite']);
  });

  it('resolves a valid id for its own mode', () => {
    expect(resolveThemePalette('light', 'linen')).toBe('linen');
    expect(resolveThemePalette('dark', 'graphite')).toBe('graphite');
  });

  it('falls back to the mode default for missing, unknown and wrong-mode ids', () => {
    expect(resolveThemePalette('light')).toBe('courtside');
    expect(resolveThemePalette('light', null)).toBe('courtside');
    expect(resolveThemePalette('light', 'bulma')).toBe('courtside');
    expect(resolveThemePalette('dark', 'linen')).toBe('midnight');
  });

  it('writes data-palette on the given root', () => {
    const root = { dataset: {} as DOMStringMap } as HTMLElement;
    expect(applyThemePalette('dark', 'graphite', root)).toBe('graphite');
    expect(root.dataset.palette).toBe('graphite');
    applyThemePalette('dark', 'slate', root);
    expect(root.dataset.palette).toBe('midnight');
  });
});
