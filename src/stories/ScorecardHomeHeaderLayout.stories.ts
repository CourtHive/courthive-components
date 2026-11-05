import { renderScorecard } from '../components/scorecard/renderScorecard';
import { expect, fn, userEvent } from 'storybook/test';

import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Scoring/Team Scorecard/Tests/Home Header Layout',
  tags: ['!dev'],
  render: () => document.createElement('div')
};
export default meta;

const SIDE = '.chc-scorecard-side';
const NAME = '.chc-scorecard-side-name';
const HOME = '.chc-scorecard-home';
const ACTION = '[data-action="set-home"]';
const HEADER = '.chc-scorecard-header';

function fixture({ width = 720, swapSides = false, longNames = false } = {}) {
  const host = document.createElement('div');
  host.style.width = `${width}px`;
  host.style.maxWidth = '100%';
  const onSetHome = fn();
  host.appendChild(
    renderScorecard({
      matchUp: {
        sides: [
          {
            sideNumber: 1,
            participantId: 'north',
            participant: { participantName: longNames ? 'North Harbour Community Tennis Association' : 'Team North' }
          },
          {
            sideNumber: 2,
            participantId: 'south',
            participant: { participantName: longNames ? 'South Valley University Tennis Club' : 'Team South' }
          }
        ],
        score: { sets: [{ side1Score: 9, side2Score: 0 }] },
        winningSide: 1
      },
      swapSides,
      labels: longNames ? { home: 'Domicile', setHome: 'Définir comme équipe à domicile' } : undefined,
      home: { homeParticipantId: 'south', basis: 'VENUE', onSetHome }
    })
  );
  return { host, onSetHome };
}

async function controlsBelowNames(host: HTMLElement): Promise<void> {
  for (const side of host.querySelectorAll<HTMLElement>(SIDE)) {
    const name = side.querySelector<HTMLElement>(NAME)!.getBoundingClientRect();
    const controls = side.querySelector<HTMLElement>(HOME)!.getBoundingClientRect();
    await expect(controls.top).toBeGreaterThanOrEqual(name.bottom);
  }
}

async function staysInsideHeader(host: HTMLElement): Promise<void> {
  const header = host.querySelector<HTMLElement>(HEADER)!.getBoundingClientRect();
  for (const element of host.querySelectorAll<HTMLElement>(`${NAME}, ${HOME}, ${ACTION}`)) {
    const box = element.getBoundingClientRect();
    await expect(box.left).toBeGreaterThanOrEqual(header.left);
    await expect(box.right).toBeLessThanOrEqual(header.right);
  }
}

export const DesktopControls: StoryObj = {
  play: async ({ canvasElement }) => {
    const { host, onSetHome } = fixture();
    canvasElement.replaceChildren(host);
    await controlsBelowNames(host);
    await staysInsideHeader(host);
    const header = host.querySelector<HTMLElement>(HEADER)!.getBoundingClientRect();
    const score = host.querySelector<HTMLElement>('.chc-scorecard-score-box')!.getBoundingClientRect();
    await expect(Math.abs((score.left + score.right - header.left - header.right) / 2)).toBeLessThan(1);
    const button = host.querySelector<HTMLButtonElement>(ACTION)!;
    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(onSetHome).toHaveBeenCalledWith('north');
    await expect(button.type).toBe('button');
  }
};

export const NarrowTranslatedNames: StoryObj = {
  play: async ({ canvasElement }) => {
    const { host } = fixture({ width: 320, longNames: true });
    canvasElement.replaceChildren(host);
    await controlsBelowNames(host);
    await staysInsideHeader(host);
    await expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
    await expect(host.querySelector('.chc-scorecard-home-tag')).toHaveTextContent('Domicile');
  }
};

export const SwappedLongNames: StoryObj = {
  play: async ({ canvasElement }) => {
    const { host, onSetHome } = fixture({ swapSides: true, longNames: true });
    canvasElement.replaceChildren(host);
    await controlsBelowNames(host);
    await staysInsideHeader(host);
    await expect(host.querySelector(SIDE)?.querySelector('.chc-scorecard-home-tag')).not.toBeNull();
    await userEvent.click(host.querySelector<HTMLButtonElement>(ACTION)!);
    await expect(onSetHome).toHaveBeenCalledWith('south');
  }
};
