/**
 * A match tiebreak's complement as it is TYPED, in both shapes a match tiebreak takes: the decider of
 * `SET3-S:6/TB7-F:TB10`, and the whole of `SET1-S:TB10`.
 *
 * `MatchTiebreakEntryTests.stories.ts` covers the decider's keystroke cases (a lower 10, an upper 16, the
 * shifted upper row). This file adds what it does not: the same for a one-set match tiebreak, the
 * complement recalculating between keystrokes, a whole value arriving in ONE input event (a paste, or
 * Playwright's `fill`, which is the same event to the region), and entry with complements off. The
 * factory's complement itself is a node contract test, `__tests__/matchTiebreakComplementEntry.test.ts`.
 */
import { createDynamicSetsRegion } from '../components/scoring/regions/dynamicSetsRegion';
import { renderScoreEntryCard } from '../components/scoring/scoreEntryCard';
import { user } from './helpers/trustedUser';
import { expect } from 'storybook/test';

import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Scoring/Score Entry/Tests/Match Tiebreak Complement',
  tags: ['!dev']
};
export default meta;

const DECIDER = 'SET3-S:6/TB7-F:TB10';
const SINGLE = 'SET1-S:TB10';
const FORMATS = [DECIDER, SINGLE];
const SPLIT_SETS = [
  { setNumber: 1, side1Score: 6, side2Score: 4 },
  { setNumber: 2, side1Score: 4, side2Score: 6 }
];

/** One card per format, side by side, each marked with the format it holds. */
function cards(smartComplements = true): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText = 'display:flex; flex-direction:column; gap:16px; padding:16px';
  for (const matchUpFormat of FORMATS) {
    const region = createDynamicSetsRegion({
      matchUpFormat,
      sets: matchUpFormat === DECIDER ? SPLIT_SETS : [],
      smartComplements,
      onChange: () => card.refresh(),
      onStructureChange: () => card.rerender()
    });
    const card = renderScoreEntryCard({
      sides: [{ participantName: 'Upper player' }, { participantName: 'Lower player' }],
      matchUpFormat,
      region
    });
    card.element.dataset.format = matchUpFormat;
    container.append(card.element);
  }
  return container;
}

function cellOf(canvasElement: HTMLElement, matchUpFormat: string) {
  const set = matchUpFormat === DECIDER ? 3 : 1;
  const card = canvasElement.querySelector<HTMLElement>(`[data-format="${matchUpFormat}"]`)!;
  return (side: number) => card.querySelector<HTMLInputElement>(`input[data-set="${set}"][data-side="${side}"]`)!;
}

/** The complement follows each keystroke: `1` faces 10, then `10` faces 12 — on either row. */
export const RecalculatesWhileTyping: StoryObj = {
  render: () => cards(),
  play: async ({ canvasElement, step }) => {
    for (const format of FORMATS) {
      for (const side of [1, 2]) {
        await step(`${format}, side ${side}`, async () => {
          const cell = cellOf(canvasElement, format);
          await user.clear(cell(1));
          await user.clear(cell(2));
          await user.click(cell(side));
          await user.keyboard('[Digit1]');
          await expect(cell(3 - side)).toHaveValue('10');
          await user.keyboard('[Digit0]');
          await expect(cell(side)).toHaveValue('10');
          await expect(cell(3 - side)).toHaveValue('12');
        });
      }
    }
  }
};

/** A whole value in one input event — a paste — completes to the factory's answer, and keeps deriving after. */
export const OneInputEventCompletes: StoryObj = {
  render: () => cards(),
  play: async ({ canvasElement, step }) => {
    for (const format of FORMATS) {
      for (const side of [1, 2]) {
        await step(`${format}, side ${side}`, async () => {
          const cell = cellOf(canvasElement, format);
          await user.fill(cell(side), '1');
          await expect(cell(3 - side)).toHaveValue('10');
          // A second whole value: the first input event did not use the complement up.
          await user.fill(cell(side), '16');
          await expect(cell(side)).toHaveValue('16');
          await expect(cell(3 - side)).toHaveValue('18');
        });
      }
    }
  }
};

/** The shifted upper row writes the UPPER cell, for the one-set match tiebreak too. */
export const ShiftedDigitsInASingleSet: StoryObj = {
  render: () => cards(),
  play: async ({ canvasElement, step }) => {
    for (const value of ['10', '16']) {
      await step(value, async () => {
        const cell = cellOf(canvasElement, SINGLE);
        await user.clear(cell(1));
        await user.clear(cell(2));
        await user.click(cell(2));
        const keys = [...value].map((digit) => '[Digit' + digit + ']').join('');
        await user.keyboard('{Shift>}' + keys + '{/Shift}');
        await expect(cell(2)).toHaveFocus();
        await expect(cell(1)).toHaveValue(value);
        await expect(cell(2)).toHaveValue(String(Number(value) + 2));
      });
    }
  }
};

/** With complements off, a two-digit score types as itself and nothing is written opposite. */
export const NoComplement: StoryObj = {
  render: () => cards(false),
  play: async ({ canvasElement, step }) => {
    for (const format of FORMATS) {
      await step(format, async () => {
        const cell = cellOf(canvasElement, format);
        await user.click(cell(2));
        await user.keyboard('[Digit1][Digit0]');
        await expect(cell(2)).toHaveValue('10');
        await expect(cell(1)).toHaveValue('');
      });
    }
  }
};
