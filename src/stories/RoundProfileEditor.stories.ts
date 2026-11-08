/**
 * The LUCKY_DRAW round-profile editor (moved from TMX 2026-11-08). Each story is also a test: its play function asserts
 * what the editor shows and returns, and `pnpm test:stories` runs them all in headless Chromium.
 */
import {
  mountRoundProfileEditor,
  type RoundProfileEditorController
} from '../components/roundProfile/roundProfileEditor';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, fn } from 'storybook/test';

type Args = { drawSize: number; initialProfile?: number[] };

const CELL = '.rpe__cell';
const controllers = new WeakMap<HTMLElement, RoundProfileEditorController>();
const onChange = fn();

const meta: Meta<Args> = {
  title: 'Draws/Round Profile Editor',
  render: (args) => {
    const host = document.createElement('div');
    host.style.maxWidth = '640px';
    host.style.padding = '1em';
    host.dataset.testid = 'rpe-host';
    controllers.set(host, mountRoundProfileEditor(host, { ...args, onChange }));
    return host;
  }
};
export default meta;
type Story = StoryObj<Args>;

const hostOf = (canvasElement: HTMLElement) => canvasElement.querySelector('[data-testid="rpe-host"]') as HTMLElement;
const cells = (canvasElement: HTMLElement) =>
  [...canvasElement.querySelectorAll<HTMLInputElement>(CELL)].map((cell) => Number(cell.value));
const badges = (canvasElement: HTMLElement) =>
  [...canvasElement.querySelectorAll<HTMLElement>('.rpe__ll')].map((badge) => Number(badge.dataset.luckyLosers));
const profileOf = (canvasElement: HTMLElement) => controllers.get(hostOf(canvasElement))?.getProfile();

/** drawSize 40 as [20, 12, 8, 4, 2, 1]: R1 → R2 takes 4 lucky losers, R2 → R3 takes 4, the rest halve cleanly. */
export const DrawSize40Custom: Story = {
  name: 'drawSize 40 — [20, 12, 8, 4, 2, 1]',
  args: { drawSize: 40, initialProfile: [20, 12, 8, 4, 2, 1] },
  play: async ({ canvasElement }) => {
    expect(cells(canvasElement)).toEqual([20, 12, 8, 4, 2, 1]);
    expect(badges(canvasElement)).toEqual([4, 4]);
    expect(profileOf(canvasElement)).toEqual([20, 12, 8, 4, 2, 1]);
  }
};

/** The default ceil-halving cascade for drawSize 40 — what a LUCKY_DRAW plays with no explicit profile. */
export const DrawSize40Default: Story = {
  name: 'drawSize 40 — default ceil-halving',
  args: { drawSize: 40 },
  play: async ({ canvasElement }) => {
    expect(cells(canvasElement)).toEqual([20, 10, 5, 3, 2, 1]);
    expect(badges(canvasElement)).toEqual([1, 1]); // 5 winners into 3 matchUps, then 3 into 2
  }
};

/** A power of 2: every round halves, no lucky losers. */
export const DrawSize32PureHalving: Story = {
  name: 'drawSize 32 — pure halving',
  args: { drawSize: 32 },
  play: async ({ canvasElement }) => {
    expect(cells(canvasElement)).toEqual([16, 8, 4, 2, 1]);
    expect(badges(canvasElement)).toEqual([]);
  }
};

/** A stretched second round pulls lucky losers into R2. */
export const DrawSize64StretchedR2: Story = {
  name: 'drawSize 64 — [32, 20, 10, 5, 3, 2, 1]',
  args: { drawSize: 64, initialProfile: [32, 20, 10, 5, 3, 2, 1] },
  play: async ({ canvasElement }) => {
    expect(cells(canvasElement)).toEqual([32, 20, 10, 5, 3, 2, 1]);
    expect(badges(canvasElement)).toEqual([8, 1, 1]);
  }
};

/** An odd drawSize cannot take an explicit profile: a notice, no inputs, and getProfile() is null. */
export const DrawSize11Disabled: Story = {
  name: 'drawSize 11 — disabled (odd)',
  args: { drawSize: 11 },
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector('.rpe--disabled')).not.toBeNull();
    expect(cells(canvasElement)).toEqual([]);
    expect(profileOf(canvasElement)).toBeNull();
  }
};

/** Editing a round re-defaults the rest of the cascade from it, clamps out-of-range input, and Reset restores it. */
export const EditCascadeAndReset: Story = {
  name: 'edit R2 → cascade, clamp, reset',
  args: { drawSize: 40 },
  play: async ({ canvasElement }) => {
    onChange.mockClear();
    const change = (index: number, value: string) => {
      const cell = canvasElement.querySelectorAll<HTMLInputElement>(CELL)[index];
      cell.value = value;
      cell.dispatchEvent(new Event('change'));
    };

    change(1, '12');
    expect(cells(canvasElement)).toEqual([20, 12, 6, 3, 2, 1]);
    expect(onChange).toHaveBeenLastCalledWith([20, 12, 6, 3, 2, 1]);

    change(1, '99'); // above the previous round → clamped to 20
    expect(cells(canvasElement)).toEqual([20, 20, 10, 5, 3, 2, 1]);

    (canvasElement.querySelector('.rpe__reset') as HTMLButtonElement).click();
    expect(cells(canvasElement)).toEqual([20, 10, 5, 3, 2, 1]);
    expect(onChange).toHaveBeenLastCalledWith([20, 10, 5, 3, 2, 1]);

    // The first round and the final are read-only.
    const inputs = canvasElement.querySelectorAll<HTMLInputElement>(CELL);
    expect(inputs[0].disabled).toBe(true);
    expect(inputs[inputs.length - 1].disabled).toBe(true);
  }
};
