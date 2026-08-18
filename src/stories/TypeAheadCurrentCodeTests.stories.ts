/**
 * createTypeAhead — code-to-label pre-fill play tests.
 *
 * `currentValue` never meant "the current value". It resolves a stored CODE to
 * its display LABEL by searching the list for a `{ value, label }` entry, which
 * is meaningful only when the two differ ('FRA' → '🇫🇷 France'). Against a list
 * of plain strings the lookup can never match, and the old code then did nothing
 * at all — no label, no warning. TMX's Edit Dates modal shipped that way against
 * `getSupportedTimeZones()`, so the field rendered empty next to a panel showing
 * the zone, and a blind Save read as "clear the zone" (TMX #1305).
 *
 * The parameter is now `currentCode`, `currentValue` remains as a deprecated
 * alias so published consumers keep working, and an unresolved code warns rather
 * than failing silently. What RENDERS is deliberately unchanged.
 *
 * The pure resolution is unit-tested in `helpers/__tests__/createTypeAhead.test.ts`;
 * these cover the wired input, which needs a real DOM.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm storybook` + `pnpm test-storybook -- --testPathPatterns TypeAheadCurrentCode`
 */

import { createTypeAhead } from '../helpers/createTypeAhead';
import { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';

const meta: Meta = {
  title: 'Forms/Tests/TypeAheadCurrentCode'
};
export default meta;

const INPUT = '[data-test="typeahead"]';
const WARN_HOST = '[data-warnings]';
const PARIS = 'Europe/Paris';
const FRANCE = '🇫🇷 France';

const COUNTRIES = [
  { value: 'FRA', label: FRANCE },
  { value: 'ESP', label: '🇪🇸 Spain' }
];
const TIME_ZONES = ['UTC', PARIS, 'America/New_York'];

type Wiring = { list: any[]; currentCode?: string; currentValue?: string; warnUnresolved?: boolean };

/** Mount an input, wire a type-ahead to it, and capture any warning it emits. */
function render({ list, currentCode, currentValue, warnUnresolved }: Wiring): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding: 16px;';

  const input = document.createElement('input');
  input.dataset.test = 'typeahead';
  wrap.appendChild(input);

  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => warnings.push(args.join(' '));
  try {
    createTypeAhead({ list, element: input, currentCode, currentValue, warnUnresolved });
  } finally {
    console.warn = originalWarn;
  }
  wrap.dataset.warnings = String(warnings.length);
  wrap.dataset.warning = warnings[0] ?? '';

  return wrap;
}

export const ResolvesCurrentCode: StoryObj = {
  render: () => render({ list: COUNTRIES, currentCode: 'FRA' }),
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector(INPUT) as HTMLInputElement;
    await expect(input.value).toBe(FRANCE);
    await expect((canvasElement.querySelector(WARN_HOST) as HTMLElement).dataset.warnings).toBe('0');
  }
};

export const DeprecatedCurrentValueStillWorks: StoryObj = {
  render: () => render({ list: COUNTRIES, currentValue: 'FRA' }),
  play: async ({ canvasElement }) => {
    // The alias is what every published consumer passes today; breaking it would
    // blank the country pickers across TMX, courthive-public and the AMS client.
    const input = canvasElement.querySelector(INPUT) as HTMLInputElement;
    await expect(input.value).toBe(FRANCE);
  }
};

export const PlainStringListWarnsInsteadOfSilence: StoryObj = {
  render: () => render({ list: TIME_ZONES, currentCode: PARIS }),
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector(INPUT) as HTMLInputElement;
    const wrap = canvasElement.querySelector(WARN_HOST) as HTMLElement;

    // Unchanged: the input is still empty. The fix is the signal, not the render.
    await expect(input.value).toBe('');
    await expect(wrap.dataset.warnings).toBe('1');
    await expect(wrap.dataset.warning).toContain('plain strings');
    await expect(wrap.dataset.warning).toContain('set the field `value` instead');
  }
};

export const UnknownCodeWarns: StoryObj = {
  render: () => render({ list: COUNTRIES, currentCode: 'GBR' }),
  play: async ({ canvasElement }) => {
    const wrap = canvasElement.querySelector(WARN_HOST) as HTMLElement;
    await expect(wrap.dataset.warnings).toBe('1');
    await expect(wrap.dataset.warning).toContain('no list entry has that `value`');
  }
};

export const WarningIsSuppressible: StoryObj = {
  render: () => render({ list: TIME_ZONES, currentCode: PARIS, warnUnresolved: false }),
  play: async ({ canvasElement }) => {
    const wrap = canvasElement.querySelector(WARN_HOST) as HTMLElement;
    await expect(wrap.dataset.warnings).toBe('0');
  }
};

export const NoCodeIsSilent: StoryObj = {
  render: () => render({ list: COUNTRIES }),
  play: async ({ canvasElement }) => {
    // A field with nothing stored yet is the normal case; it must not warn.
    const wrap = canvasElement.querySelector(WARN_HOST) as HTMLElement;
    await expect(wrap.dataset.warnings).toBe('0');
    await expect((canvasElement.querySelector(INPUT) as HTMLInputElement).value).toBe('');
  }
};
