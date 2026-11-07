/**
 * Add playoffs mode on a live draw — play tests.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories src/stories/TopologyAddPlayoffsTests.stories.ts`
 */
import '../styles/theme.css';
import '../styles/schematic.css';
import '../components/topology-builder/ui/topology-builder.css';

import { liveTopologyHost } from './helpers/liveTopologyHost';
import { expect } from 'storybook/test';

import type { LiveTopologyHost } from './helpers/liveTopologyHost';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Draws/Topology Builder/Tests/Add Playoffs',
  tags: ['!dev']
};
export default meta;
type Story = StoryObj;

const PLAYOFF_1_16 = 'Playoff 1-16';
const PLAYOFF_5_8 = 'Playoff 5-8';
const MAIN = 'Main';
const ARIA_PRESSED = 'aria-pressed';
const OFFER = '.tb-card-offer';
const ROUND_OFFER = 'tb-round-offer';
const TOGGLE = 'button.tb-mode-toggle[data-mode="addPlayoffs"]';

let host: LiveTopologyHost;
const mount = (mode?: 'view' | 'addPlayoffs') => {
  host = liveTopologyHost({ mode });
  return host.element;
};

const card = (root: HTMLElement, name: string) =>
  [...root.querySelectorAll<HTMLElement>('.tb-card')].find(
    (c) => c.querySelector('.tb-card-name')?.textContent === name
  );
const chips = (root: HTMLElement, name: string) =>
  [...(card(root, name)?.querySelectorAll<HTMLButtonElement>(OFFER) ?? [])].map((c) => c.textContent);
const chip = (root: HTMLElement, name: string, range: string) =>
  card(root, name)?.querySelector<HTMLButtonElement>(`.tb-card-offer[data-finishing-position-range="${range}"]`);

export const ChipsOnlyInTheMode: Story = {
  render: () => mount(),
  play: async ({ canvasElement }) => {
    const toggle = canvasElement.querySelector<HTMLButtonElement>(TOGGLE)!;
    await expect(toggle).toBeTruthy();
    await expect(toggle.getAttribute(ARIA_PRESSED)).toBe('false');
    // no chips until the operator asks for them (CA: "so the chips aren't always visible")
    await expect(canvasElement.querySelectorAll(OFFER)).toHaveLength(0);

    toggle.click();
    await expect(canvasElement.querySelector(TOGGLE)!.getAttribute(ARIA_PRESSED)).toBe('true');
    // the live draw's answer, not the mock-draw cache's: 1-16 is already played off, so it is not offered again
    await expect(chips(canvasElement, MAIN)).toEqual(['+ 17–24', '+ 25–32']);
    await expect(chips(canvasElement, PLAYOFF_1_16)).toEqual(['+ 3–4', '+ 5–8', '+ 9–16']);
    // in the mode, the mock-draw rounds line is never shown for a live draw
    await expect(canvasElement.querySelector('.tb-card-rounds')).toBeNull();

    canvasElement.querySelector<HTMLButtonElement>(TOGGLE)!.click();
    await expect(canvasElement.querySelectorAll(OFFER)).toHaveLength(0);
  }
};

export const PointingBoxesTheSourceRound: Story = {
  render: () => mount('addPlayoffs'),
  play: async ({ canvasElement }) => {
    const fiveToEight = chip(canvasElement, PLAYOFF_1_16, '5-8')!;
    const round = () =>
      card(canvasElement, PLAYOFF_1_16)!.querySelector<HTMLElement>(
        '.chc-schematic-round-container[data-round-number="2"]'
      );
    await expect(round()).toBeTruthy();
    await expect(round()!.classList.contains(ROUND_OFFER)).toBe(false);

    fiveToEight.dispatchEvent(new MouseEvent('mouseenter'));
    await expect(round()!.classList.contains(ROUND_OFFER)).toBe(true);
    fiveToEight.dispatchEvent(new MouseEvent('mouseleave'));
    await expect(round()!.classList.contains(ROUND_OFFER)).toBe(false);

    // the keyboard gets the same pointer
    fiveToEight.focus();
    await expect(round()!.classList.contains(ROUND_OFFER)).toBe(true);
    await expect(fiveToEight.getAttribute('aria-label')).toBe(
      'Add a playoff for positions 5-8, from losers of round 2'
    );
  }
};

export const AChipAttachesThatOnePlayoff: Story = {
  render: () => mount('addPlayoffs'),
  play: async ({ canvasElement }) => {
    chip(canvasElement, PLAYOFF_1_16, '5-8')!.click();

    // the draw has the playoff, the topology was read again from it, and the operator is still in the mode
    await expect(host.structureNames()).toEqual([MAIN, PLAYOFF_1_16, PLAYOFF_5_8]);
    await expect(card(canvasElement, PLAYOFF_5_8)).toBeTruthy();
    await expect(canvasElement.querySelector(TOGGLE)!.getAttribute(ARIA_PRESSED)).toBe('true');
    await expect(chips(canvasElement, PLAYOFF_1_16)).toEqual(['+ 3–4', '+ 9–16']);
    // the new playoff offers what it can feed in turn
    await expect(chips(canvasElement, PLAYOFF_5_8)).toEqual(['+ 7–8']);

    // a round robin chip plays off a group finishing position
    chip(canvasElement, MAIN, '17-24')!.click();
    await expect(host.added).toEqual([PLAYOFF_5_8, 'Playoff 17-24']);
    await expect(chips(canvasElement, MAIN)).toEqual(['+ 25–32']);
  }
};

export const NothingLeftToAdd: Story = {
  render: () => mount('addPlayoffs'),
  play: async ({ canvasElement }) => {
    // play off everything the draw offers, chip by chip, until no chip is left
    for (let guard = 0; guard < 40; guard += 1) {
      const next = canvasElement.querySelector<HTMLButtonElement>(OFFER);
      if (!next) break;
      next.click();
    }
    await expect(canvasElement.querySelectorAll(OFFER)).toHaveLength(0);
    // leaving the mode is still possible; entering it again is not, and the toggle says why
    const toggle = () => canvasElement.querySelector<HTMLButtonElement>(TOGGLE)!;
    await expect(toggle().disabled).toBe(false);
    toggle().click();
    await expect(toggle().disabled).toBe(true);
    await expect(toggle().title).toBe('Every finishing position is already played off');
  }
};
