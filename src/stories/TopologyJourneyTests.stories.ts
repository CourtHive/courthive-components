/**
 * Player journey mode — play tests.
 *
 * Run as tests: `pnpm test:stories src/stories/TopologyJourneyTests.stories.ts`
 */
import '../styles/theme.css';
import '../styles/schematic.css';
import '../components/topology-builder/ui/topology-builder.css';

import { journeyTopologyHost } from './helpers/journeyTopologyHost';
import { expect } from 'storybook/test';

import type { JourneyTopologyHost } from './helpers/journeyTopologyHost';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Draws/Topology Builder/Tests/Player Journey',
  tags: ['!dev']
};
export default meta;
type Story = StoryObj;

const TOGGLE = 'button.tb-mode-toggle[data-mode="journey"]';
const MAIN = 'Main';
const CONSOLATION = 'Consolation';

let host: JourneyTopologyHost;
const mount = () => {
  host = journeyTopologyHost({ height: '720px' });
  return host.element;
};
const card = (root: HTMLElement, name: string) =>
  [...root.querySelectorAll<HTMLElement>('.tb-card')].find(
    (c) => c.querySelector('.tb-card-name')?.textContent === name
  )!;
const lit = (root: HTMLElement, name: string) =>
  [...card(root, name).querySelectorAll<HTMLElement>('.tb-round-journey')].map(
    (round) => `R${round.dataset.roundNumber} ${round.dataset.journeyResult}`
  );

export const SearchThenFollow: Story = {
  render: () => mount(),
  play: async ({ canvasElement }) => {
    // the search is hidden until the mode is on
    const search = canvasElement.querySelector<HTMLElement>('.tb-journey-search')!;
    await expect(search.hidden).toBe(true);
    canvasElement.querySelector<HTMLButtonElement>(TOGGLE)!.click();
    await expect(search.hidden).toBe(false);
    await expect(canvasElement.querySelector('.tb-footer-hint')!.textContent).toBe(
      'Type a name to follow a participant'
    );

    // typing offers the participant by name — the one place a name appears
    const input = canvasElement.querySelector<HTMLInputElement>('.tb-journey-input')!;
    input.value = host.traveller.name.slice(0, 4);
    input.dispatchEvent(new Event('input'));
    const option = [...canvasElement.querySelectorAll<HTMLButtonElement>('.tb-journey-result')].find(
      (o) => o.dataset.participantId === host.traveller.participantId
    )!;
    await expect(option.textContent).toBe(host.traveller.name);
    option.click();

    await expect(host.control.getState().journeyParticipantId).toBe(host.traveller.participantId);
    await expect(canvasElement.querySelectorAll('.tb-journey-result')).toHaveLength(0);
  }
};

export const TheJourneyAcrossStructures: Story = {
  render: () => {
    mount();
    host.control.showJourney(host.traveller.participantId);
    return host.element;
  },
  play: async ({ canvasElement }) => {
    const steps = host.control.getState().journeyParticipantId && host.traveller;
    await expect(steps).toBeTruthy();
    // the main draw: lost somewhere, so fed into the consolation; both cards are on the journey
    await expect(card(canvasElement, MAIN).classList.contains('tb-card--on-journey')).toBe(true);
    await expect(card(canvasElement, CONSOLATION).classList.contains('tb-card--on-journey')).toBe(true);
    const mainRounds = lit(canvasElement, MAIN);
    await expect(mainRounds.at(-1)).toMatch(/LOST$/);
    await expect(lit(canvasElement, CONSOLATION).length).toBeGreaterThan(0);

    // the link they travelled is lit, and only links they travelled
    const travelled = canvasElement.querySelectorAll('path.tb-edge--journey');
    await expect(travelled.length).toBe(1);

    // the summary names structures and rounds, never the participant
    const summary = canvasElement.querySelector('.tb-footer-hint')!.textContent!;
    await expect(summary.startsWith('Main R1')).toBe(true);
    await expect(summary).toContain('→ Consolation');
    // no name anywhere on the canvas or in the summary
    const canvas = canvasElement.querySelector('.tb-canvas')!.textContent!;
    await expect(canvas.includes(host.traveller.name)).toBe(false);
    await expect(summary.includes(host.traveller.name)).toBe(false);

    // a lit round goes to that matchUp
    card(canvasElement, CONSOLATION).querySelector<HTMLElement>('.tb-round-journey')!.click();
    await expect(host.stepped).toHaveLength(1);
    await expect(host.stepped[0].matchUpId).toBeDefined();
  }
};
