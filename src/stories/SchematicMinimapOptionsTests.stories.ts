/**
 * Structure — configurable schematic and minimap, play-function tests.
 *
 * Structure rendering vNext item 12. `renderSchematicStructure({ options })` takes the slot height, connector
 * width, matchUp width, radius and colours; `buildStructureMinimap` takes the connector colour and stroke
 * width. Every default equals the original fixed rendering, so leaving them out changes nothing.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderSchematicStructure } from '../components/renderSchematicStructure/renderSchematicStructure';
import { buildStructureMinimap } from '../components/renderStructure/renderStructureMinimap';
import { generateEventData } from '../data/generateEventData';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';
// the library entry imports it; Storybook's preview does not
import '../styles/schematic.css';

const meta: Meta = {
  title: 'Draws/Structure/Tests/Schematic And Minimap Options',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'schematic-host';

function matchUps(): any[] {
  const { eventData } = generateEventData({ drawSize: 16, completeAllMatchUps: false }) || {};
  const roundMatchUps = eventData?.drawsData?.[0]?.structures?.[0]?.roundMatchUps;
  return roundMatchUps ? (Object.values(roundMatchUps).flat() as any[]) : [];
}

const renderHost = () => {
  const container = document.createElement('div');
  container.dataset.testid = HOST_TESTID;
  return container;
};

function measure(schematic: HTMLElement) {
  const slot = schematic.querySelector('.chc-schematic-slot') as HTMLElement;
  const matchUp = schematic.querySelector('.chc-schematic-matchup') as HTMLElement;
  const link = schematic.querySelector('.chc-schematic-link--m1') as HTMLElement;
  return {
    slotHeight: getComputedStyle(slot).height,
    slotRadius: getComputedStyle(slot).borderTopLeftRadius,
    slotColor: getComputedStyle(slot).backgroundColor,
    matchUpWidth: getComputedStyle(matchUp).width,
    connectorWidth: link.style.getPropertyValue('--chc-schematic-connector-w'),
    m1Height: link.style.getPropertyValue('--chc-schematic-m1-h'),
    connectorColor: getComputedStyle(link, '::after').borderInlineEndColor
  };
}

export const SchematicDefaultsAndOptions: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;
    const data = matchUps();
    expect(data.length).toBe(15); // control

    const plain = renderSchematicStructure({ matchUps: data });
    host.appendChild(plain);
    // the original fixed rendering
    expect(measure(plain)).toMatchObject({
      slotHeight: '5px',
      slotRadius: '1px',
      matchUpWidth: '40px',
      connectorWidth: '8px',
      m1Height: '5.5px' // a matchUp is 2 × 5 + 1 = 11px; the first round reaches half of it
    });

    const tuned = renderSchematicStructure({
      matchUps: data,
      options: {
        slotHeight: 8,
        connectorWidth: 12,
        matchUpWidth: 60,
        radius: '4px',
        slotColor: 'rgb(1, 2, 3)',
        connectorColor: 'rgb(4, 5, 6)'
      }
    });
    host.appendChild(tuned);
    expect(measure(tuned)).toEqual({
      slotHeight: '8px',
      slotRadius: '4px',
      slotColor: 'rgb(1, 2, 3)',
      matchUpWidth: '60px',
      connectorWidth: '12px',
      m1Height: '8.5px', // 2 × 8 + 1 = 17, halved
      connectorColor: 'rgb(4, 5, 6)'
    });
  }
};

export const MinimapOptions: StoryObj = {
  render: renderHost,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;
    const data = matchUps();

    const plain = buildStructureMinimap({ matchUps: data }) as HTMLElement;
    host.appendChild(plain);
    const plainLine = plain.querySelector('.chc-minimap-line') as SVGElement;
    expect(plainLine).not.toBeNull(); // control
    expect(getComputedStyle(plainLine).strokeWidth).toBe('1px');

    const tuned = buildStructureMinimap({
      matchUps: data,
      connectorColor: 'rgb(7, 8, 9)',
      strokeWidth: 2
    }) as HTMLElement;
    host.appendChild(tuned);
    const line = tuned.querySelector('.chc-minimap-line') as SVGElement;
    expect(getComputedStyle(line).stroke).toBe('rgb(7, 8, 9)');
    expect(getComputedStyle(line).strokeWidth).toBe('2px');
  }
};
