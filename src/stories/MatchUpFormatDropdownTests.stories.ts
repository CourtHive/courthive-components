/**
 * The picker's dropdowns close on a click outside them, through a listener attached 100 ms after opening
 * so the opening click does not close the dropdown at once. Closing a dropdown must cancel that pending
 * attach: otherwise a dropdown closed within 100 ms still attaches its listener later, and that listener
 * then closes the NEXT dropdown on a click inside it.
 *
 * The timing rule itself (nothing heard before the delay, nothing left pending after a cancel) is a node
 * test of `helpers/outsideClick.ts`. These plays check the dropdowns use it so an operator sees the
 * difference: in real time, with real clicks. Moved from the retired happy-dom `dropdowns.test.ts`.
 */
import { closeCurrentDropdown, createDropdown, createGameFormatDropdown } from '../components/matchUpFormat/dropdowns';
import { expect, fn, waitFor } from 'storybook/test';
import { user } from './helpers/trustedUser';

import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Scoring/MatchUp Format/Tests/Dropdowns',
  tags: ['!dev']
};
export default meta;

const OPEN = '.dropdown.is-active';
/** Longer than the 100 ms the outside-click listener waits before attaching. */
const PAST_THE_LISTENER_DELAY = 200;

const pastTheListenerDelay = () => new Promise((resolve) => setTimeout(resolve, PAST_THE_LISTENER_DELAY));
const openDropdowns = () => document.querySelectorAll<HTMLElement>(OPEN);

const onUpdate = fn();

function harness(): HTMLElement {
  closeCurrentDropdown();
  onUpdate.mockClear();
  const container = document.createElement('div');
  container.style.cssText = 'padding:16px; display:flex; flex-direction:column; gap:12px; align-items:flex-start';

  const list = document.createElement('button');
  list.id = 'openList';
  list.className = 'button';
  list.textContent = 'Open a list';
  list.onclick = (e) => createDropdown(e, [{ text: 'first', onClick: () => undefined }]);

  // One click opens a list, closes it at once (well inside 100 ms) and opens the game-format chooser,
  // whose rows are clicked to choose and must not close it.
  const race = document.createElement('button');
  race.id = 'openThenReplace';
  race.className = 'button';
  race.textContent = 'Open a list, close it at once, open the game format';
  race.onclick = (e) => {
    createDropdown(e, [{ text: 'first', onClick: () => undefined }]);
    closeCurrentDropdown();
    createGameFormatDropdown(e, undefined, {}, onUpdate);
  };

  const outside = document.createElement('p');
  outside.id = 'outside';
  // Above the triggers: every dropdown opens below its trigger, so nothing is drawn over this.
  outside.textContent = 'Somewhere outside any dropdown.';

  container.append(outside, list, race);
  return container;
}

export const OutsideClickCloses: StoryObj = {
  name: 'A click outside closes the open dropdown once its listener is attached',
  render: harness,
  play: async ({ canvasElement }) => {
    await user.click(canvasElement.querySelector('#openList')!);
    await expect(openDropdowns(), 'the opening click does not close it').toHaveLength(1);
    await expect(openDropdowns()[0]).toBeVisible();

    await pastTheListenerDelay();
    await user.click(canvasElement.querySelector('#outside')!);

    await waitFor(() => expect(openDropdowns()).toHaveLength(0));
  }
};

export const ClosedDropdownCannotCloseTheNext: StoryObj = {
  name: 'A dropdown closed before its listener attached cannot close the next one',
  render: harness,
  play: async ({ canvasElement }) => {
    await user.click(canvasElement.querySelector('#openThenReplace')!);
    await expect(openDropdowns()).toHaveLength(1);
    const chooser = openDropdowns()[0];
    await expect(chooser.querySelector('input[name="gameType"]'), 'control: the game-format chooser').toBeTruthy();

    await pastTheListenerDelay();
    const traditional = [...chooser.querySelectorAll<HTMLElement>('label')].find(
      (row) => row.textContent === 'Traditional'
    )!;
    await user.click(traditional);

    await expect(onUpdate, 'control: the click reached the row').toHaveBeenCalledWith({ type: 'TRADITIONAL' });
    await expect(chooser, 'a click inside the second dropdown keeps it open').toBeVisible();
    await expect(openDropdowns()).toHaveLength(1);

    // control: the second dropdown's own listener is attached, so an outside click still closes it
    await user.click(canvasElement.querySelector('#outside')!);
    await waitFor(() => expect(openDropdowns()).toHaveLength(0));
  }
};
