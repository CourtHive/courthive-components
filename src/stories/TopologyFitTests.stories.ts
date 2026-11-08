/**
 * Fit mode — play tests.
 *
 * Run as tests: `pnpm test:stories src/stories/TopologyFitTests.stories.ts`
 */
import '../styles/theme.css';
import '../styles/schematic.css';
import '../components/topology-builder/ui/topology-builder.css';

import { fitTopologyHost } from './helpers/fitTopologyHost';
import { expect } from 'storybook/test';

import type { FitTopologyHost } from './helpers/fitTopologyHost';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Draws/Topology Builder/Tests/Fit Mode',
  tags: ['!dev']
};
export default meta;
type Story = StoryObj;

const TOGGLE = 'button.tb-mode-toggle[data-mode="fit"]';
const MAIN = 'Main';
const QUALIFYING = 'Qualifying';

let host: FitTopologyHost;
const mount = (mode?: 'view' | 'fit') => {
  host = fitTopologyHost({ mode, height: '720px' });
  return host.element;
};

const card = (root: HTMLElement, name: string) =>
  [...root.querySelectorAll<HTMLElement>('.tb-card')].find(
    (c) => c.querySelector('.tb-card-name')?.textContent === name
  )!;
const status = (root: HTMLElement, name: string) =>
  card(root, name).querySelector<HTMLElement>('.tb-fit-status')?.dataset.status;
const sentence = (root: HTMLElement, name: string) => card(root, name).querySelector('.tb-fit-text')?.textContent;
const step = (root: HTMLElement, name: string, lever: string, direction: string) =>
  card(root, name).querySelector<HTMLButtonElement>(
    `.tb-fit-stepper[data-lever="${lever}"] .tb-fit-step[data-direction="${direction}"]`
  )!;
const ledger = (root: HTMLElement) => root.querySelector('.tb-footer-hint')!.textContent;

export const GaugesOnlyInTheMode: Story = {
  render: () => mount(),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('.tb-fit')).toHaveLength(0);
    canvasElement.querySelector<HTMLButtonElement>(TOGGLE)!.click();
    await expect(canvasElement.querySelector(TOGGLE)!.getAttribute('aria-pressed')).toBe('true');
    // the main draw takes 24 DA + 4 WC and 4 qualifiers: full
    await expect(status(canvasElement, MAIN)).toBe('FITS');
    await expect(sentence(canvasElement, MAIN)).toBe('28 entered · 4 qualifiers');
    // the qualifying draw has 12 for 16 positions and no seeds: 4 BYEs nobody is owed
    await expect(status(canvasElement, QUALIFYING)).toBe('SHORT');
    await expect(sentence(canvasElement, QUALIFYING)).toBe('12 entered · 4 BYEs');
    await expect(ledger(canvasElement)).toBe('Main  24 DA · 4 WC · 6 ALT · 2 WD   |   Qualifying  12 DA');
  }
};

export const TheLeversMoveTheFit: Story = {
  render: () => mount('fit'),
  play: async ({ canvasElement }) => {
    // one more qualifier: 28 + 5 for 32 positions — one direct entry has no place
    step(canvasElement, QUALIFYING, 'qualifiers', 'up').click();
    await expect(status(canvasElement, MAIN)).toBe('OVER');
    await expect(sentence(canvasElement, MAIN)).toBe('27 entered · 5 qualifiers · 1 not placed');
    await expect(ledger(canvasElement)).toContain('1 not placed');

    // back to four, then double the main draw: 28 + 4 in 64 — 32 BYEs, no seeds to take them
    step(canvasElement, QUALIFYING, 'qualifiers', 'down').click();
    await expect(status(canvasElement, MAIN)).toBe('FITS');
    step(canvasElement, MAIN, 'size', 'up').click();
    await expect(card(canvasElement, MAIN).querySelector('.tb-card-size')!.textContent).toBe('×64');
    await expect(status(canvasElement, MAIN)).toBe('SHORT');
    await expect(sentence(canvasElement, MAIN)).toBe('28 entered · 4 qualifiers · 32 BYEs');
    // the bar's segments are the fit's own counts
    const segment = (kind: string) =>
      card(canvasElement, MAIN).querySelector<HTMLElement>(`.tb-fit-seg[data-kind="${kind}"]`)?.dataset.count;
    await expect([segment('placed'), segment('qualifier'), segment('bye')]).toEqual(['28', '4', '32']);
  }
};

export const DraggingDoesNotRegenerate: Story = {
  render: () => mount('fit'),
  play: async () => {
    const asked = host.fitCalls();
    const main = host.control.getState().nodes.find((n) => n.structureName === MAIN)!;
    // a card moved across the canvas, and selected: the topology's fit-relevant shape is unchanged
    host.control.loadState({
      ...host.control.getState(),
      nodes: host.control.getState().nodes.map((n) => (n.id === main.id ? { ...n, position: { x: 600, y: 400 } } : n)),
      selectedNodeId: main.id
    });
    await expect(host.fitCalls()).toBe(asked);
  }
};
