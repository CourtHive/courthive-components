/**
 * Structure — deprecated options still behave as they did.
 *
 * CA, 2026-10-25: deprecate, don't remove. Each option in the "Deprecated options" register of
 * `Mentat/planning/STRUCTURE_RENDERING_VNEXT.md` is marked `@deprecated` in `src/types.ts` with what to
 * use instead, and must keep doing exactly what it did, inert ones included, until a later major
 * decides. These pin that, so a cleanup cannot quietly turn deprecation into removal.
 *
 * `connectorWidth` is the opposite case, a real option that was undeclared: it is now declared, and
 * pinned here as working.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderStructure } from '../components/renderStructure/renderStructure';
import { generateEventData } from '../data/generateEventData';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import type { Configuration } from '../types';
import { expect } from 'storybook/test';

const meta: Meta = {
  title: 'Draws/Structure/Tests/Deprecated Options',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'deprecated-options-host';
const DRAW_SIZE = 8;

const matchUps = (): any[] => {
  const { eventData } = generateEventData({ drawSize: DRAW_SIZE, completeAllMatchUps: true }) || {};
  const roundMatchUps = eventData?.drawsData?.[0]?.structures?.[0]?.roundMatchUps;
  return roundMatchUps ? (Object.values(roundMatchUps).flat() as any[]) : [];
};

// ONE draw for every render, so two renders differ only by the configuration under test
let draw: any[] | undefined;
const render = (configuration: Configuration): HTMLElement => {
  draw ??= matchUps();
  return renderStructure({ composition: { ...compositions.Australian, configuration }, matchUps: draw });
};

const renderHost = () => {
  const container = document.createElement('div');
  container.dataset.testid = HOST_TESTID;
  return container;
};

export const DeprecatedOptionsKeepTheirBehaviour: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;

    // teamLogo still renders its (demo) logo on every side
    const withLogo = render({ teamLogo: true });
    host.appendChild(withLogo);
    const sides = withLogo.querySelectorAll('.tmx-p').length;
    expect(sides).toBe((DRAW_SIZE - 1) * 2); // control: every side rendered
    expect(withLogo.querySelectorAll('.chc-team-logo img').length).toBe(sides);
    expect(render({ teamLogo: false }).querySelectorAll('.chc-team-logo').length).toBe(0);

    // matchUpHover still adds its class
    expect(render({ matchUpHover: true }).querySelectorAll('.chc-matchup--custom-hover').length).toBe(DRAW_SIZE - 1);
    expect(render({}).querySelectorAll('.chc-matchup--custom-hover').length).toBe(0);

    // flag and useParticipantName stay inert: the output is the same as without them
    const markup = (configuration: Configuration) => render(configuration).innerHTML;
    expect(markup({ flag: true, useParticipantName: true })).toBe(markup({}));
  }
};

export const ConnectorWidthIsDeclaredAndWorks: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;
    const structure = render({ connectorWidth: 24 });
    host.appendChild(structure);

    const widths = [...structure.querySelectorAll<HTMLElement>('.chc-link')].map((link) =>
      link.style.getPropertyValue('--chc-connector-w')
    );
    expect(widths.length).toBeGreaterThan(0);
    expect(new Set(widths)).toEqual(new Set(['24px']));
  }
};
