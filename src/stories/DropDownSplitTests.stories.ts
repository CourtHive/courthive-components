/**
 * dropDownButton `split: true` — play tests.
 *
 * A split button runs its most common action from the label and keeps the others behind the caret (TMX's Add draw,
 * CA 2026-11-17: the drawer stays one click, the draw builder and saved templates are in the menu). Without `split`
 * a click anywhere on the button opens the menu, so the label's own action and the menu fought over one click.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories src/stories/DropDownSplitTests.stories.ts`
 */
import { controlBar } from '../components/controlBar/controlBar';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { user } from './helpers/trustedUser';
import { expect, fn } from 'storybook/test';

const meta: Meta = {
  title: 'Policies & Setup/Control Bar/Tests/Split Button',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const MENU_OPEN = '.dropdown.is-active';

function render(onMain: () => void, onBuilder: () => void): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'padding: 1em; min-height: 240px;';
  const bar = document.createElement('div');
  root.appendChild(bar);
  controlBar({
    target: bar,
    items: [
      {
        label: 'Add draw',
        intent: 'is-primary',
        location: 'right',
        split: true,
        align: 'right',
        onClick: onMain,
        options: [{ label: 'Draw builder', onClick: onBuilder, close: true }]
      }
    ]
  });
  return root;
}

export const LabelRunsTheMainAction: StoryObj = {
  render: (args: any) => render(args.onMain, args.onBuilder),
  args: { onMain: fn(), onBuilder: fn() },
  play: async ({ canvasElement, args }) => {
    const main = canvasElement.querySelector<HTMLButtonElement>('.dropdown-split-main')!;
    await expect(main).toHaveTextContent('Add draw');
    await user.click(main);
    await expect(args.onMain).toHaveBeenCalledTimes(1);
    // the main action never opens the menu
    await expect(canvasElement.querySelector(MENU_OPEN)).toBeNull();
  }
};

export const CaretOpensTheMenu: StoryObj = {
  render: (args: any) => render(args.onMain, args.onBuilder),
  args: { onMain: fn(), onBuilder: fn() },
  play: async ({ canvasElement, args }) => {
    const toggle = canvasElement.querySelector<HTMLButtonElement>('.dropdown-split-toggle')!;
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAccessibleName('Add draw: more');
    await user.click(toggle);
    await expect(canvasElement.querySelector(MENU_OPEN)).not.toBeNull();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(args.onMain).not.toHaveBeenCalled();

    const item = canvasElement.querySelector<HTMLElement>('.dropdown-item')!;
    await user.click(item);
    await expect(args.onBuilder).toHaveBeenCalledTimes(1);
    await expect(args.onMain).not.toHaveBeenCalled();
  }
};
