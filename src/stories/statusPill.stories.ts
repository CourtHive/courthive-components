import { renderStatusPill } from '../components/renderStructure/renderStatusPill';
import { expect } from 'storybook/test';

import { matchUpStatusConstants } from 'tods-competition-factory';

const {
  WALKOVER,
  RETIRED,
  DEFAULTED,
  SUSPENDED,
  AWAITING_RESULT,
  CANCELLED,
  IN_PROGRESS,
  ABANDONED,
  DEAD_RUBBER,
  INCOMPLETE,
  DOUBLE_WALKOVER,
  DOUBLE_DEFAULT
} = matchUpStatusConstants;

export default {
  title: 'Draws/MatchUps/Status',
  tags: ['autodocs'],
  render: ({ ...args }) => {
    return renderStatusPill({ ...args });
  }
};

export const Walkover = {
  args: {
    matchUpStatus: WALKOVER
  }
};

export const Defaulted = {
  args: {
    matchUpStatus: DEFAULTED
  }
};

export const Cancelled = {
  args: {
    matchUpStatus: CANCELLED
  }
};

export const Abandoned = {
  args: {
    matchUpStatus: ABANDONED
  }
};

export const Retirement = {
  args: {
    matchUpStatus: RETIRED
  }
};

export const Awaiting = {
  args: {
    matchUpStatus: AWAITING_RESULT
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const pill = canvasElement.querySelector<HTMLElement>('.chc-pill')!;
    await expect(pill).toBeVisible();
    await expect(pill).toHaveTextContent('AWA');
    // the abbreviation is the text; the full status is the hover
    await expect(pill.querySelector('abbr')?.title).toBe(AWAITING_RESULT);
  }
};

export const InProgress = {
  args: {
    matchUpStatus: IN_PROGRESS
  }
};

export const Suspended = {
  args: {
    matchUpStatus: SUSPENDED
  }
};

export const DeadRubber = {
  args: { matchUpStatus: DEAD_RUBBER },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const pill = canvasElement.querySelector<HTMLElement>('.chc-pill')!;
    const control = renderStatusPill({ matchUpStatus: WALKOVER });
    canvasElement.appendChild(control);
    await expect(pill).toHaveTextContent('DR');
    await expect(getComputedStyle(pill).backgroundColor).toBe(getComputedStyle(control).backgroundColor);
    control.remove();
  }
};

export const Incomplete = {
  args: { matchUpStatus: INCOMPLETE },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const pill = canvasElement.querySelector<HTMLElement>('.chc-pill')!;
    const control = renderStatusPill({ matchUpStatus: SUSPENDED });
    canvasElement.appendChild(control);
    await expect(pill).toHaveTextContent('INC');
    await expect(getComputedStyle(pill).backgroundColor).toBe(getComputedStyle(control).backgroundColor);
    control.remove();
  }
};

export const DoubleWalkover = { args: { matchUpStatus: DOUBLE_WALKOVER } };
export const DoubleDefault = { args: { matchUpStatus: DOUBLE_DEFAULT } };
