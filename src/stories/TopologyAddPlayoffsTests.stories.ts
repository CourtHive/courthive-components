/**
 * Add playoffs mode on a live draw — play tests.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories src/stories/TopologyAddPlayoffsTests.stories.ts`
 */
import '../styles/theme.css';
import '../styles/schematic.css';
import '../components/topology-builder/ui/topology-builder.css';

import { ELIMINATION_16, liveTopologyHost } from './helpers/liveTopologyHost';
import { user } from './helpers/trustedUser';
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
const PAGE_1_4 = '+ Page playoff 1–4';
const ROUND_OFFER = 'tb-round-offer';
const TOGGLE = 'button.tb-mode-toggle[data-mode="addPlayoffs"]';

let host: LiveTopologyHost;
const mount = (mode?: 'view' | 'addPlayoffs', height = '720px') => {
  host = liveTopologyHost({ mode, height });
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

    await user.click(toggle);
    await expect(canvasElement.querySelector(TOGGLE)!.getAttribute(ARIA_PRESSED)).toBe('true');
    // the live draw's answer, not the mock-draw cache's: 1-16 is already played off, so it is not offered again
    await expect(chips(canvasElement, MAIN)).toEqual(['+ 17–24', '+ 25–32']);
    // the 1-16 playoff offers 3-4, so it offers a page playoff for 1-4 beside it
    await expect(chips(canvasElement, PLAYOFF_1_16)).toEqual([PAGE_1_4, '+ 3–4', '+ 5–8', '+ 9–16']);
    // in the mode, the mock-draw rounds line is never shown for a live draw
    await expect(canvasElement.querySelector('.tb-card-rounds')).toBeNull();

    await user.click(canvasElement.querySelector<HTMLButtonElement>(TOGGLE)!);
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

    await user.hover(fiveToEight);
    await expect(round()!.classList.contains(ROUND_OFFER)).toBe(true);
    await user.unhover(fiveToEight);
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
    await user.click(chip(canvasElement, PLAYOFF_1_16, '5-8')!);

    // the draw has the playoff, the topology was read again from it, and the operator is still in the mode
    await expect(host.structureNames()).toEqual([MAIN, PLAYOFF_1_16, PLAYOFF_5_8]);
    await expect(card(canvasElement, PLAYOFF_5_8)).toBeTruthy();
    await expect(canvasElement.querySelector(TOGGLE)!.getAttribute(ARIA_PRESSED)).toBe('true');
    await expect(chips(canvasElement, PLAYOFF_1_16)).toEqual([PAGE_1_4, '+ 3–4', '+ 9–16']);
    // the new playoff offers what it can feed in turn
    await expect(chips(canvasElement, PLAYOFF_5_8)).toEqual(['+ 7–8']);

    // a round robin chip plays off a group finishing position
    await user.click(chip(canvasElement, MAIN, '17-24')!);
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
      await user.click(next);
    }
    await expect(canvasElement.querySelectorAll(OFFER)).toHaveLength(0);
    // leaving the mode is still possible; entering it again is not, and the toggle says why
    const toggle = () => canvasElement.querySelector<HTMLButtonElement>(TOGGLE)!;
    await expect(toggle().disabled).toBe(false);
    await user.click(toggle());
    await expect(toggle().disabled).toBe(true);
    await expect(toggle().title).toBe('Every finishing position is already played off');
  }
};

export const FillsTheHostWithAFooter: Story = {
  render: () => mount('addPlayoffs', '640px'),
  play: async ({ canvasElement }) => {
    // the canvas and the footer fill the host top to bottom, whatever the content (CA, 2026-11-08)
    const layout = canvasElement.querySelector<HTMLElement>('.tb-layout')!;
    const footer = canvasElement.querySelector<HTMLElement>('.tb-footer')!;
    await expect(layout.getBoundingClientRect().height).toBe(640);
    await expect(Math.round(footer.getBoundingClientRect().bottom)).toBe(
      Math.round(host.element.getBoundingClientRect().bottom)
    );
    // the grid scrolls with the content rather than staying painted on the box
    // (the grid is two gradient layers, so the computed value lists one attachment per layer)
    const attachments = getComputedStyle(canvasElement.querySelector('.tb-canvas')!).backgroundAttachment.split(', ');
    await expect(attachments).toEqual(['local', 'local']);
    // the footer says what the mode asks
    await expect(canvasElement.querySelector('.tb-footer-hint')!.textContent).toBe(
      '6 structures can still be added — choose a chip to add it'
    );
    await user.click(canvasElement.querySelector<HTMLButtonElement>(TOGGLE)!);
    await expect(canvasElement.querySelector('.tb-footer-hint')!.textContent).toBe('');
    await expect(host.control.getFooterSlot()).toBe(canvasElement.querySelector('.tb-footer-slot'));
  }
};

export const LinksSpanContentTallerThanTheCanvas: Story = {
  render: () => mount('addPlayoffs', '360px'),
  play: async ({ canvasElement }) => {
    // three playoffs from the 1-16 stack its column well below a 360px canvas
    for (const range of ['9-16', '5-8', '3-4']) await user.click(chip(canvasElement, PLAYOFF_1_16, range)!);
    const canvas = canvasElement.querySelector<HTMLElement>('.tb-canvas')!;
    const nodes = canvasElement.querySelector<HTMLElement>('.tb-canvas-nodes')!;
    const svg = canvasElement.querySelector<SVGElement>('.tb-canvas-svg')!;
    await expect(nodes.offsetHeight).toBeGreaterThan(canvas.clientHeight);
    // the links layer covers the content, so a link below the first screenful is drawn
    await expect(svg.getBoundingClientRect().height).toBeGreaterThanOrEqual(nodes.offsetHeight);
  }
};

const mountElimination = () => {
  host = liveTopologyHost({ mode: 'addPlayoffs', height: '640px', drawProfile: ELIMINATION_16 });
  return host.element;
};
const chipOfKind = (root: HTMLElement, kind: string) =>
  card(root, MAIN)?.querySelector<HTMLButtonElement>(`.tb-card-offer[data-kind="${kind}"]`);

export const PagePlayoffBesideThirdFourth: Story = {
  render: () => mountElimination(),
  play: async ({ canvasElement }) => {
    // the page playoff is the alternative to 3-4, offered wherever 3-4 is; the voluntary consolation comes last
    await expect(chips(canvasElement, MAIN)).toEqual([
      '+ Page playoff 1\u20134',
      '+ 3\u20134',
      '+ 5\u20138',
      '+ 9\u201316',
      '+ Voluntary consolation'
    ]);
    const page = chipOfKind(canvasElement, 'pagePlayoff')!;
    // it draws from the semifinal, whose losers would otherwise play 3-4
    const semifinal = () =>
      card(canvasElement, MAIN)!.querySelector<HTMLElement>('.chc-schematic-round-container[data-round-number="3"]');
    await user.hover(page);
    await expect(semifinal()!.classList.contains(ROUND_OFFER)).toBe(true);

    await user.click(page);
    await expect(host.structureNames()).toEqual(['Main', '3-4 Playoff', 'Playoff Qualifier', 'Playoff Final']);
    // the factory no longer offers 3-4, so both alternatives are gone
    await expect(chips(canvasElement, MAIN)).toEqual(['+ 5\u20138', '+ 9\u201316', '+ Voluntary consolation']);
    for (const name of ['3-4 Playoff', 'Playoff Qualifier', 'Playoff Final']) {
      await expect(card(canvasElement, name)).toBeTruthy();
    }
  }
};

export const VoluntaryConsolationBesideMain: Story = {
  render: () => mountElimination(),
  play: async ({ canvasElement }) => {
    await user.click(chipOfKind(canvasElement, 'voluntaryConsolation')!);

    await expect(host.structureNames()).toEqual(['Main', 'Consolation']);
    const vc = card(canvasElement, 'Consolation')!;
    // its own stage: a VC badge, and the opt-in state where a schematic would be
    await expect(vc.querySelector('.tb-card-badge')!.textContent).toBe('VC');
    await expect(vc.querySelector('.tb-card-preview')!.textContent).toBe('Main-draw losers opt in');
    await expect(vc.querySelector('.tb-card-size')!.textContent).toBe('');
    // beside Main, in the next column — not stacked under it as a second main draw
    const main = card(canvasElement, MAIN)!.getBoundingClientRect();
    const consolation = vc.getBoundingClientRect();
    await expect(consolation.left).toBeGreaterThan(main.right);
    await expect(Math.round(consolation.top)).toBe(Math.round(main.top));
    // one only
    await expect(chipOfKind(canvasElement, 'voluntaryConsolation')).toBeNull();
  }
};
