import { createDynamicSetsRegion } from '../components/scoring/regions/dynamicSetsRegion';
import { renderScoreEntryCard } from '../components/scoring/scoreEntryCard';
import { expect, userEvent } from 'storybook/test';

import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Scoring/Score Entry/Tests/Match Tiebreak',
  tags: ['!dev']
};
export default meta;

const FORMAT = 'SET3-S:6/TB7-F:TB10';
const cell = (host: HTMLElement, side: number) =>
  host.querySelector<HTMLInputElement>(`input[data-set="3"][data-side="${side}"]`)!;

function renderCard(): HTMLElement {
  const region = createDynamicSetsRegion({
    matchUpFormat: FORMAT,
    sets: [
      { setNumber: 1, side1Score: 6, side2Score: 4 },
      { setNumber: 2, side1Score: 4, side2Score: 6 }
    ],
    onChange: () => card.refresh(),
    onStructureChange: () => card.rerender()
  });
  const card = renderScoreEntryCard({
    sides: [{ participantName: 'Upper player' }, { participantName: 'Lower player' }],
    matchUpFormat: FORMAT,
    region
  });
  return card.element;
}

export const LowerTen: StoryObj = {
  render: renderCard,
  play: async ({ canvasElement }) => {
    await userEvent.click(cell(canvasElement, 2));
    await userEvent.keyboard('[Digit1][Digit0]');
    await expect(cell(canvasElement, 2)).toHaveValue('10');
    await expect(cell(canvasElement, 1)).toHaveValue('12');
  }
};

export const UpperSixteen: StoryObj = {
  render: renderCard,
  play: async ({ canvasElement }) => {
    await userEvent.click(cell(canvasElement, 1));
    await userEvent.keyboard('[Digit1][Digit6]');
    await expect(cell(canvasElement, 1)).toHaveValue('16');
    await expect(cell(canvasElement, 2)).toHaveValue('18');
  }
};

export const ShiftedTen: StoryObj = {
  render: renderCard,
  play: async ({ canvasElement }) => {
    await userEvent.click(cell(canvasElement, 2));
    await userEvent.keyboard('{Shift>}[Digit1][Digit0]{/Shift}');
    await expect(cell(canvasElement, 1)).toHaveValue('10');
    await expect(cell(canvasElement, 2)).toHaveValue('12');
    await expect(cell(canvasElement, 2)).toHaveFocus();
  }
};

export const ShiftedSixteen: StoryObj = {
  render: renderCard,
  play: async ({ canvasElement }) => {
    await userEvent.click(cell(canvasElement, 2));
    await userEvent.keyboard('{Shift>}[Digit1][Digit6]{/Shift}');
    await expect(cell(canvasElement, 1)).toHaveValue('16');
    await expect(cell(canvasElement, 2)).toHaveValue('18');
  }
};
