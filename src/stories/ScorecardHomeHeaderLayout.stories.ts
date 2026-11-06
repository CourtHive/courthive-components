/**
 * Team scorecard — the home team's place in the header, measured in the browser.
 *
 * Pinned here:
 *
 * - the HOME label sits above the home team's name, and both names share one line whether or not either is home;
 * - the score stays centred, and the corner gear never overlaps a name or the score, at desktop and phone widths;
 * - opening the edit moves no name, and the label follows the team chosen;
 * - long, translated names stay inside the header.
 *
 * Run as tests: `pnpm test:stories`
 */
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
const TAG = '.chc-scorecard-home-tag';
const GEAR = '[data-action="edit-home"]';
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
      labels: longNames ? { home: 'Domicile', editHome: "Modifier l'équipe à domicile" } : undefined,
      home: { homeParticipantId: 'south', basis: 'VENUE', onSetHome }
    })
  );
  return { host, onSetHome };
}

const rect = (element: Element | null) => (element as HTMLElement).getBoundingClientRect();
const overlaps = (a: DOMRect, b: DOMRect) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

async function labelAboveItsName(host: HTMLElement): Promise<void> {
  const side = [...host.querySelectorAll<HTMLElement>(SIDE)].find((candidate) => candidate.querySelector(TAG))!;
  await expect(rect(side.querySelector(TAG)).bottom).toBeLessThanOrEqual(rect(side.querySelector(NAME)).top + 1);
}

async function staysInsideHeader(host: HTMLElement): Promise<void> {
  const header = rect(host.querySelector(HEADER));
  for (const element of host.querySelectorAll<HTMLElement>(`${NAME}, ${TAG}, ${GEAR}`)) {
    const box = element.getBoundingClientRect();
    await expect(box.left).toBeGreaterThanOrEqual(header.left);
    await expect(box.right).toBeLessThanOrEqual(header.right);
  }
}

async function gearClearOfEverything(host: HTMLElement): Promise<void> {
  const gear = rect(host.querySelector(GEAR));
  for (const element of host.querySelectorAll(`${NAME}, ${TAG}, .chc-scorecard-score-box`)) {
    await expect(overlaps(gear, rect(element))).toBe(false);
  }
}

export const DesktopLayout: StoryObj = {
  play: async ({ canvasElement }) => {
    const { host } = fixture();
    canvasElement.replaceChildren(host);
    await labelAboveItsName(host);
    await staysInsideHeader(host);
    await gearClearOfEverything(host);
    const [left, right] = [...host.querySelectorAll(NAME)].map(rect);
    await expect(Math.abs(left.top - right.top), 'one line for both names').toBeLessThan(1);
    const header = rect(host.querySelector(HEADER));
    const score = rect(host.querySelector('.chc-scorecard-score-box'));
    await expect(Math.abs((score.left + score.right - header.left - header.right) / 2)).toBeLessThan(1);
  }
};

export const EditMovesNoName: StoryObj = {
  play: async ({ canvasElement }) => {
    const { host, onSetHome } = fixture();
    canvasElement.replaceChildren(host);
    const before = [...host.querySelectorAll(NAME)].map(rect);

    const gear = host.querySelector<HTMLButtonElement>(GEAR)!;
    gear.focus();
    await userEvent.keyboard('{Enter}');
    const after = [...host.querySelectorAll(NAME)].map(rect);
    for (const [index, box] of after.entries()) {
      await expect(Math.abs(box.left - before[index].left)).toBeLessThan(1);
      await expect(Math.abs(box.top - before[index].top)).toBeLessThan(1);
    }

    // the label follows the choice, and Enter on the check saves it
    await userEvent.click(host.querySelectorAll<HTMLButtonElement>('[data-action="choose-home"]')[0]);
    await expect(host.querySelectorAll(SIDE)[0].querySelector(TAG)).not.toBeNull();
    host.querySelector<HTMLButtonElement>('[data-action="save-home"]')!.focus();
    await userEvent.keyboard('{Enter}');
    await expect(onSetHome).toHaveBeenCalledWith('north');
  }
};

export const NarrowTranslatedNames: StoryObj = {
  play: async ({ canvasElement }) => {
    const { host } = fixture({ width: 320, longNames: true });
    canvasElement.replaceChildren(host);
    await labelAboveItsName(host);
    await staysInsideHeader(host);
    await gearClearOfEverything(host);
    await expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth);
    await expect(host.querySelector(TAG)).toHaveTextContent('Domicile');
    await expect(host.querySelector(GEAR)?.getAttribute('aria-label')).toBe("Modifier l'équipe à domicile");
  }
};

export const SwappedLongNames: StoryObj = {
  play: async ({ canvasElement }) => {
    const { host } = fixture({ swapSides: true, longNames: true });
    canvasElement.replaceChildren(host);
    await labelAboveItsName(host);
    await staysInsideHeader(host);
    await gearClearOfEverything(host);
    await expect(host.querySelector(SIDE)?.querySelector(TAG)).not.toBeNull();
  }
};
