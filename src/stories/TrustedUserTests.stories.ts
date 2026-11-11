import type { Meta, StoryObj } from '@storybook/html-vite';
import { user } from './helpers/trustedUser';
import { expect } from 'storybook/test';

// Pins what `trustedUser` is FOR. Each check below is one testing-library's in-page `userEvent` gets
// wrong (measured 2026-11-10), so if the helper ever silently falls back to it under the test runner,
// this story fails rather than every other story quietly passing on untrusted input.
//
// Tagged `!dev`: the trusted path does not exist in the Storybook UI.

const meta: Meta = { title: 'Testing/Trusted User', tags: ['!dev'] };
export default meta;

function fixture() {
  const root = document.createElement('div');
  root.innerHTML = `
    <button id="probe">probe</button>
    <input id="before" />
    <div inert><button id="inert-button">unreachable</button></div>
    <input id="after" />
    <div style="position: relative; width: 200px; height: 40px">
      <button id="covered" style="width: 200px; height: 40px">covered</button>
      <div style="position: absolute; inset: 0"></div>
    </div>
  `;
  return root;
}

const byId = (root: HTMLElement, id: string) => root.querySelector(`#${id}`) as HTMLElement;

export const DeliversTrustedEvents: StoryObj = {
  render: fixture,
  play: async ({ canvasElement }) => {
    await expect(await user.isTrusted()).toBe(true);
    let trusted: boolean | undefined;
    byId(canvasElement, 'probe').addEventListener('click', (event) => (trusted = event.isTrusted));
    await user.click(byId(canvasElement, 'probe'));
    await expect(trusted).toBe(true);
  }
};

export const TabFollowsTheBrowsersOrder: StoryObj = {
  render: fixture,
  play: async ({ canvasElement }) => {
    await expect(await user.isTrusted()).toBe(true);
    byId(canvasElement, 'before').focus();
    await user.tab();
    await expect(byId(canvasElement, 'after')).toHaveFocus();
  }
};

export const RefusesAClickOnACoveredElement: StoryObj = {
  render: fixture,
  play: async ({ canvasElement }) => {
    // Without this, a backend that failed to load would also "refuse" the click.
    await expect(await user.isTrusted()).toBe(true);
    let clicks = 0;
    byId(canvasElement, 'covered').addEventListener('click', () => clicks++);
    // A refused click surfaces as Playwright's actionability timeout; the default is long, so race it.
    const outcome = await Promise.race([
      user.click(byId(canvasElement, 'covered')).then(
        () => 'clicked',
        () => 'refused'
      ),
      new Promise((resolve) => setTimeout(() => resolve('refused'), 2000))
    ]);
    await expect(outcome).toBe('refused');
    await expect(clicks).toBe(0);
  }
};
