import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { renderScorecard } from '../components/scorecard/renderScorecard';
import { compositions } from '../compositions/compositions';
import { applyThemePalette } from '../theme/palettes';
import { expect } from 'storybook/test';

// constants and types
import type { Meta, StoryObj } from '@storybook/html-vite';

type Args = { mode: 'light' | 'dark'; width: number; swapped: boolean };
export default { title: 'Scoring/Team Branding Audit', parameters: { layout: 'fullscreen' } } satisfies Meta<Args>;
type Story = StoryObj<Args>;

function match(winner?: number, server?: number): any {
  return {
    matchUpId: `match-${winner}-${server}`,
    matchUpType: 'SINGLES',
    matchUpStatus: winner ? 'COMPLETED' : 'IN_PROGRESS',
    winningSide: winner,
    serverSideNumber: server,
    sides: [1, 2].map((sideNumber) => ({
      sideNumber,
      participant: {
        participantId: `p${sideNumber}`,
        participantType: 'INDIVIDUAL',
        participantName: 'Alexandria Montgomery-Wellington',
        person: { standardGivenName: 'Alexandria', standardFamilyName: 'Montgomery-Wellington' }
      }
    })),
    score: {
      sets: [
        {
          setNumber: 1,
          side1Score: winner === 2 ? 4 : 6,
          side2Score: winner === 1 ? 4 : 6,
          winningSide: winner,
          side1PointScore: winner ? undefined : '15',
          side2PointScore: winner ? undefined : '30'
        }
      ]
    }
  };
}

function render(args: Args): HTMLElement {
  document.documentElement.dataset.theme = args.mode;
  applyThemePalette(args.mode);
  const root = document.createElement('div');
  root.style.cssText = `width:${args.width}px;max-width:100%;padding:12px;box-sizing:border-box;background:var(--chc-bg-primary);color:var(--chc-text-primary)`;
  for (const [winner, server] of [
    [1, undefined],
    [2, undefined],
    [undefined, 1],
    [undefined, 2],
    [undefined, undefined]
  ]) {
    const card = renderMatchUp({ matchUp: match(winner, server), composition: compositions.Scoreboard });
    card.dataset.audit = winner ? `winner${winner}` : `server${server}`;
    root.appendChild(card);
  }
  for (const primary of ['#ffffff', '#ffff00', '#000000', '#110022']) {
    const teams = [1, 2].map((sideNumber) => ({
      sideNumber,
      participant: {
        participantId: `team${sideNumber}`,
        participantType: 'TEAM',
        participantName: `Team ${sideNumber} Montgomery-Wellington`,
        teamColors: {
          palette: [
            { colorId: 'accent', value: primary, group: 'Primary' },
            { colorId: 'trim', value: '#abcdef', group: 'Primary' },
            { colorId: 'white', value: '#ffffff', group: 'Primary' },
            { colorId: 'black', value: '#000000', group: 'Primary' }
          ],
          display: { primary: 'accent', secondary: 'trim' }
        }
      }
    }));
    const line = match(2);
    line.collectionId = 'lines';
    line.collectionPosition = 1;
    line.sides.forEach((side: any) => {
      side.teamParticipant = teams.find((team) => team.sideNumber === side.sideNumber)?.participant;
    });
    const card = renderScorecard({
      matchUp: {
        ...match(2),
        sides: teams.toReversed(),
        tieFormat: { collectionDefinitions: [{ collectionId: 'lines', collectionName: 'Singles' }] },
        tieMatchUps: [line]
      },
      composition: compositions.Scoreboard,
      teamBranding: true,
      swapSides: args.swapped
    });
    card.dataset.primary = primary.toUpperCase();
    root.appendChild(card);
  }
  return root;
}

function luminance(color: number[]): number {
  return color
    .slice(0, 3)
    .map((c) => c / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}
const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
function contrast(element: Element): number {
  let color = [0, 0, 0, 0];
  for (let parent: Element | null = element; parent && color[3] < 0.999; parent = parent.parentElement) {
    const next = rgb(getComputedStyle(parent).backgroundColor);
    const alpha = next[3] ?? 1;
    const combined = color[3] + alpha * (1 - color[3]);
    color = [0, 1, 2]
      .map((i) => (color[i] * color[3] + next[i] * alpha * (1 - color[3])) / (combined || 1))
      .concat(combined);
  }
  const foreground = luminance(rgb(getComputedStyle(element).color));
  const background = luminance(color);
  return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
}
function play({ canvasElement, args }: { canvasElement: HTMLElement; args: Args }) {
  expect(document.documentElement.dataset.theme).toBe(args.mode);
  expect(document.documentElement.dataset.palette).toBe(args.mode === 'dark' ? 'midnight' : 'courtside');
  const winner = (n: number) =>
    canvasElement.querySelector(`[data-audit="winner${n}"] [data-winner] .chc-participant-name`)!;
  expect(getComputedStyle(winner(1)).color).toBe(getComputedStyle(winner(2)).color);
  const loser = (n: number) =>
    canvasElement.querySelector(`[data-audit="winner${n}"] .tmx-sd:not([data-winner]) .chc-participant-name`)!;
  expect(getComputedStyle(loser(1)).color).toBe(getComputedStyle(loser(2)).color);
  expect(canvasElement.querySelector('[data-side-color]')).toBeNull();
  expect(canvasElement.querySelectorAll('[data-audit="server1"] .chc-server--active')).toHaveLength(1);
  expect(canvasElement.querySelectorAll('[data-audit="serverundefined"] .chc-server--active')).toHaveLength(0);
  for (const card of canvasElement.querySelectorAll<HTMLElement>('[data-primary]')) {
    expect(card.querySelectorAll('.chc-team-accent')).toHaveLength(4);
    for (const accent of card.querySelectorAll<HTMLElement>('.chc-team-accent'))
      expect(accent.style.getPropertyValue('--chc-team-primary')).toBe(card.dataset.primary);
  }
  for (const text of canvasElement.querySelectorAll(
    '.chc-participant-name, .chc-scorecard-side-name, .chc-scorecard-side-score, .chc-point-score'
  )) {
    expect(contrast(text), text.className).toBeGreaterThanOrEqual(4.5);
  }
  // Falsify the contrast detector with an actual painted failure.
  const bad = document.createElement('span');
  bad.style.cssText = 'color:#ffffff;background:#ffffff';
  canvasElement.appendChild(bad);
  expect(contrast(bad)).toBe(1);
  bad.remove();
}
export const Light: Story = { args: { mode: 'light', width: 900, swapped: false }, render, play };
export const Dark: Story = { args: { mode: 'dark', width: 900, swapped: true }, render, play };
export const NarrowLight: Story = { args: { mode: 'light', width: 320, swapped: true }, render, play };
export const NarrowDark: Story = { args: { mode: 'dark', width: 320, swapped: false }, render, play };
