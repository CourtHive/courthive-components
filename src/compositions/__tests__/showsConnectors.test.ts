import { describe, it, expect } from 'vitest';
import { showsConnectors } from '../showsConnectors';
import { compositions } from '../compositions';

describe('showsConnectors', () => {
  it('follows the theme when configuration.connectors is unset', () => {
    expect(showsConnectors(compositions.Australian)).toBe(true);
    expect(showsConnectors(compositions.BasicCard)).toBe(false);
    expect(showsConnectors(compositions.Wimbledon)).toBe(false);
  });

  it('is the configured value whatever the theme', () => {
    const { theme } = compositions.BasicCard;
    expect(showsConnectors({ theme, configuration: { connectors: true } })).toBe(true);
    expect(showsConnectors({ theme: compositions.Australian.theme, configuration: { connectors: false } })).toBe(false);
  });

  it('Scoreboard and Watch draw their lines, on the theme that hides them by default', () => {
    expect(compositions.Scoreboard.theme).toBe(compositions.BasicCard.theme);
    expect(showsConnectors(compositions.Scoreboard)).toBe(true);
    expect(showsConnectors(compositions.Watch)).toBe(true);
  });

  it('draws lines for no composition at all', () => {
    expect(showsConnectors()).toBe(true);
    expect(showsConnectors({ theme: '', configuration: {} })).toBe(true);
  });
});
