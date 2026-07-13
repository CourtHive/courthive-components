import { describe, it, expect } from 'vitest';

import { burstChart, renderburstChart } from '../burstChart';

/**
 * Regression: a round-robin-qualifying (CONTAINER) or ungenerated-MAIN structure
 * has no bracket rounds, so `buildTournamentHierarchy` used to throw
 * "No round data found in draw" — an uncaught error that crashed the whole draws
 * grid in TMX. The sunburst must no-op gracefully instead. The guard returns before
 * any DOM/d3 access, so these run in the node test env without a document.
 */
describe('burstChart — no round data', () => {
  const container = {} as unknown as HTMLElement; // guard returns before touching the DOM

  it('renderburstChart no-ops (returns an inert handle) when roundMatchUps is empty', () => {
    const instance = renderburstChart(container, { drawSize: 0, roundMatchUps: {} } as any, '');
    expect(typeof instance.highlightPlayer).toBe('function');
    expect(instance.highlightPlayer()).toBe(0);
    expect(() => instance.hide(true)).not.toThrow();
    expect(() => instance.setColorMode('default')).not.toThrow();
  });

  it('renderburstChart no-ops when roundMatchUps is missing entirely', () => {
    expect(() => renderburstChart(container, {} as any, '')).not.toThrow();
  });

  it('burstChart().render() no-ops for a draw with no rounds instead of throwing', () => {
    expect(() =>
      burstChart({ width: 240, height: 240 }).render(container, { drawSize: 0, roundMatchUps: {} } as any, ''),
    ).not.toThrow();
  });
});
