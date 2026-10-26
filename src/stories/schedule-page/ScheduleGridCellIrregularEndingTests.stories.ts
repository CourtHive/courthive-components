/**
 * Schedule grid cell — an irregular ending is shown beside its score.
 *
 * A retirement, default or abandonment usually carries the score at the moment it ended. The cell showed that
 * score alone (`0-2`), which reads as a completed result. Now the marker is a badge on the side that left (CA,
 * 2026-10-26): `RET 0-2` when side 1 retired, `2-0 RET` when side 2 did. A score string that already ends in the
 * marker (`4-6 2-1 RET.`) shows it once.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { buildScheduleGridCell } from '../../components/schedule-page';
import { matchUpStatusConstants } from 'tods-competition-factory';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { SINGLES_COMPLETED } from './cellData';
import { expect } from 'storybook/test';

const { COMPLETED, RETIRED, DEFAULTED, ABANDONED, WALKOVER } = matchUpStatusConstants;

const meta: Meta = {
  title: 'Scheduling/Schedule Page/Grid Cell/Tests/Irregular Endings',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const HOST_TESTID = 'irregular-ending-host';
const BADGE = '.spl-grid-cell__score-ending';

const cell = (matchUpStatus: string, scoreStringSide1?: string, winningSide?: number) =>
  buildScheduleGridCell({
    ...SINGLES_COMPLETED,
    winningSide,
    matchUpStatus,
    score: scoreStringSide1 ? { scoreStringSide1, scoreStringSide2: scoreStringSide1 } : undefined
  } as any);

const scoreOf = (el: HTMLElement) => el.querySelector('.spl-grid-cell__score') as HTMLElement | null;

export const IrregularEndingsAreBadged: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.dataset.testid = HOST_TESTID;
    return container;
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector(`[data-testid="${HOST_TESTID}"]`) as HTMLElement;

    // the reported case: side 1 retired (side 2 won) with a bare score; the badge goes on side 1's end
    const retired = cell(RETIRED, '0-2', 2);
    host.appendChild(retired);
    expect(scoreOf(retired)?.querySelector(BADGE)?.textContent).toBe('RET');
    expect(scoreOf(retired)?.textContent).toBe('RET 0-2');

    // side 2 retired (side 1 won): the badge goes after, on side 2's end
    const side2Retired = cell(RETIRED, '2-0', 1);
    expect(scoreOf(side2Retired)?.textContent).toBe('2-0 RET');
    expect(scoreOf(side2Retired)?.lastElementChild?.matches(BADGE)).toBe(true);

    // a score that already ends in the marker shows it once
    expect(scoreOf(cell(RETIRED, '4-6 2-1 RET.', 2))?.textContent).toBe('RET 4-6 2-1');

    expect(scoreOf(cell(DEFAULTED, '6-4 3-4', 2))?.textContent).toBe('DEF 6-4 3-4');
    expect(scoreOf(cell(DEFAULTED, '6-4 3-4', 1))?.textContent).toBe('6-4 3-4 DEF');
    // an abandonment has no winner: first
    expect(scoreOf(cell(ABANDONED, '6-4 3-4'))?.textContent).toBe('ABN 6-4 3-4');

    // unchanged: a completed score, and an ending with no score
    const completed = cell(COMPLETED, '6-3 6-4', 1);
    expect(scoreOf(completed)?.querySelector(BADGE)).toBeNull();
    expect(scoreOf(completed)?.textContent).toBe('6-3 6-4');
    expect(scoreOf(cell(WALKOVER))?.textContent).toBe('WALKOVER');
    expect(scoreOf(cell(RETIRED))?.textContent).toBe('RET.');

    // a visible badge in both colour modes
    const root = document.documentElement;
    const previous = root.dataset.theme;
    try {
      for (const mode of ['light', 'dark']) {
        root.dataset.theme = mode;
        const badge = scoreOf(retired)?.querySelector(BADGE) as HTMLElement;
        const style = getComputedStyle(badge);
        expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(style.color).not.toBe(getComputedStyle(scoreOf(retired) as HTMLElement).backgroundColor);
      }
    } finally {
      if (previous === undefined) delete root.dataset.theme;
      else root.dataset.theme = previous;
    }
  }
};
