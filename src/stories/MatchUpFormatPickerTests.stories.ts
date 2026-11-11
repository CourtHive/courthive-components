/**
 * The format picker in a browser: what only a rendered picker can show.
 *
 * The rules (what each control reads, offers and shows for a code) are node tests in
 * `components/matchUpFormat/__tests__/pickerView.test.ts`. These plays check that the modal draws what the
 * view says — a hidden control is not visible, a locked or read-only one is disabled — that its footer
 * reports, and that one picker's state does not reach the next. Moved from the retired happy-dom suites
 * `modalBehaviour`, `modalStateMachine` and `formatModalMatchesScoreEntry`.
 */
import { getMatchUpFormatModal } from '../components/matchUpFormat/matchUpFormat';
import { closeCurrentDropdown } from '../components/matchUpFormat/dropdowns';
import { expect, fn, waitFor } from 'storybook/test';
import { cModal } from '../components/modal/cmodal';
import { user } from './helpers/trustedUser';

import type { MatchUpFormatConfig } from '../components/matchUpFormat/matchUpFormat';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Scoring/MatchUp Format/Tests/Picker',
  tags: ['!dev']
};
export default meta;

const MODAL = 'section[id^="cmdl-"]';
const STANDARD = 'SET3-S:6/TB7';
const BLW = 'INN4XA-S:O3-M:T50';
const TIEBREAK_SETS = 'SET3-S:TB11';
const CUSTOM = 'Custom';
const LAUNCHER = 'Open the picker';

function closeAll(): void {
  closeCurrentDropdown();
  for (let attempt = 0; attempt < 6 && document.querySelector(MODAL); attempt += 1) cModal.close();
}

const el = <T extends HTMLElement = HTMLElement>(id: string) => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`#${id} is not rendered`);
  return found as T;
};
const code = () => el('matchUpFormatString').textContent;
const toggleLabel = (id: string) => document.querySelector<HTMLElement>(`label[for="${id}"]`)!;

function footer(label: string): HTMLButtonElement {
  const button = [...document.querySelectorAll<HTMLButtonElement>(`${MODAL} .chc-modal-footer button`)].find(
    (candidate) => candidate.textContent?.trim() === label
  );
  if (!button) throw new Error(`no ${label} button in the footer`);
  return button;
}

/** Open a control's dropdown and choose an item by its text, as an operator would. */
async function choose(id: string, text: string): Promise<void> {
  await user.click(el(id));
  const item = await waitFor(() => {
    const items = [...document.querySelectorAll<HTMLElement>('.dropdown.is-active .dropdown-menu > div')];
    const match = items.find((candidate) => candidate.textContent === text);
    expect(
      match,
      `"${text}" is offered by ${id} (offered: ${items.map((i) => i.textContent).join(', ')})`
    ).toBeTruthy();
    return match!;
  });
  await user.click(item);
}

/** One picker, opened from a launcher in the canvas the way a host opens it. */
function launcher(label: string): HTMLElement {
  const container = document.createElement('div');
  container.style.padding = '16px';
  const button = document.createElement('button');
  button.className = 'button is-info';
  button.id = 'openPicker';
  button.textContent = label;
  container.appendChild(button);
  return container;
}

/** Wire the launcher to open a picker on `matchUpFormat`, and report what it hands back. */
async function openFrom(
  canvasElement: HTMLElement,
  matchUpFormat: string,
  config?: MatchUpFormatConfig
): Promise<{ callback: ReturnType<typeof fn>; onClose: ReturnType<typeof fn> }> {
  const callback = fn();
  const onClose = fn();
  const button = canvasElement.querySelector<HTMLButtonElement>('#openPicker')!;
  button.onclick = () => getMatchUpFormatModal({ existingMatchUpFormat: matchUpFormat, config, callback, onClose });
  await user.click(button);
  await waitFor(() => expect(code()).toBe(matchUpFormat));
  return { callback, onClose };
}

export const FooterReports: StoryObj = {
  name: 'Cancel reports an empty code, Select the code shown, and both report the close',
  render: () => launcher(LAUNCHER),
  play: async ({ canvasElement }) => {
    closeAll();
    const cancelled = await openFrom(canvasElement, 'SET3-S:6/TB7-F:6');
    await user.click(footer('Cancel'));
    await expect(cancelled.callback).toHaveBeenCalledTimes(1);
    await expect(cancelled.callback).toHaveBeenCalledWith('');
    await expect(cancelled.onClose).toHaveBeenCalledTimes(1);
    await expect(document.querySelector(MODAL)).toBeNull();

    const selected = await openFrom(canvasElement, STANDARD);
    await choose('setTo', '4');
    await user.click(footer('Select'));
    await expect(selected.callback).toHaveBeenCalledTimes(1);
    await expect(selected.callback).toHaveBeenCalledWith('SET3-S:4/TB7');
    await expect(selected.onClose).toHaveBeenCalledTimes(1);
    await expect(document.querySelector(MODAL)).toBeNull();
  }
};

export const ControlsFollowTheView: StoryObj = {
  name: 'Each control is drawn as the view says: shown, hidden or locked',
  render: () => launcher(LAUNCHER),
  play: async ({ canvasElement }) => {
    closeAll();
    await openFrom(canvasElement, STANDARD);
    await expect(el('setTo'), 'control: a standard set shows its games target').toBeVisible();

    await choose('what', 'Tiebreaks');
    await expect(code()).toBe('SET3-S:TB7');
    await expect(el('setTo')).not.toBeVisible();
    await expect(el('tiebreakAt')).not.toBeVisible();
    await expect(el('tiebreakTo')).toBeVisible();
    await expect(el('winBy')).toBeVisible();
    await expect(toggleLabel('setTiebreak')).not.toBeVisible();

    // A points total is the whole match: Best of is locked at 1 and the final set has no such control.
    await choose('what', 'Points total');
    await expect(code()).toBe('SET1-S:P32');
    await expect(el('bestOf')).toBeDisabled();
    await expect(el('bestOf')).toHaveTextContent('1');
    await expect(el('finalSetFormat')).not.toBeVisible();
    await expect(toggleLabel('finalSetOption')).not.toBeVisible();
    await expect(document.getElementById('pointsTotal-1')).toBeNull();
    await user.click(footer('Cancel'));
  }
};

export const FinalSetLeavesWithASingleSet: StoryObj = {
  name: 'The final set and its toggle go when the match becomes a single set',
  render: () => launcher(LAUNCHER),
  play: async ({ canvasElement }) => {
    closeAll();
    const { callback } = await openFrom(canvasElement, 'SET3-S:6/TB7-F:TB10');
    await expect(el('finalSetFormat'), 'control: the final set is drawn').toBeVisible();
    await expect(el('what-1')).toHaveTextContent('Tiebreak');

    await choose('bestOf', '1');
    await expect(code()).toBe('SET1-S:6/TB7');
    await expect(el('finalSetFormat')).not.toBeVisible();
    await expect(toggleLabel('finalSetOption')).not.toBeVisible();
    await user.click(footer('Select'));
    await expect(callback).toHaveBeenCalledTimes(1);
    await expect(callback).toHaveBeenCalledWith('SET1-S:6/TB7');
  }
};

export const ReadOnlyUntilReplaced: StoryObj = {
  name: 'A format that needs a switched-off capability is read-only until another replaces it',
  render: () => launcher(LAUNCHER),
  play: async ({ canvasElement }) => {
    closeAll();
    const noOuts: MatchUpFormatConfig = { capabilities: { setTypes: { outs: false } } };
    const untouched = await openFrom(canvasElement, BLW, noOuts);
    await expect(el('matchUpFormatReadOnly')).toBeVisible();
    await expect(el('bestOf')).toBeDisabled();
    await expect(el('aggregateOption')).toBeDisabled();
    await user.click(footer('Select'));
    await expect(untouched.callback).toHaveBeenCalledTimes(1);
    await expect(untouched.callback).toHaveBeenCalledWith(BLW);

    const replaced = await openFrom(canvasElement, BLW, noOuts);
    await user.selectOptions(el('matchUpFormatSelector'), STANDARD);
    await waitFor(() => expect(code()).toBe(STANDARD));
    await expect(el('matchUpFormatReadOnly')).not.toBeVisible();
    await expect(el('bestOf')).toBeEnabled();
    await choose('setTo', '4');
    await user.click(footer('Select'));
    await expect(replaced.callback).toHaveBeenCalledTimes(1);
    await expect(replaced.callback).toHaveBeenCalledWith('SET3-S:4/TB7');

    await openFrom(canvasElement, STANDARD);
    await expect(el('matchUpFormatReadOnly'), 'control: an editable format shows no notice').not.toBeVisible();
    await user.click(footer('Cancel'));
  }
};

export const CatalogShowsCustom: StoryObj = {
  name: 'The catalog select reads Custom off the catalog, and choosing Custom keeps the format',
  render: () => launcher(LAUNCHER),
  play: async ({ canvasElement }) => {
    closeAll();
    const { callback } = await openFrom(canvasElement, STANDARD);
    const selector = el<HTMLSelectElement>('matchUpFormatSelector');
    await expect(selector).toHaveValue(STANDARD);

    await choose('tiebreakTo', '10');
    await expect(code(), 'control: a tiebreak to 10 is not a catalog format').toBe('SET3-S:6/TB10');
    await expect(selector).toHaveValue(CUSTOM);
    await expect(selector.selectedOptions[0]).toHaveTextContent(CUSTOM);

    await choose('tiebreakTo', '7');
    await expect(selector).toHaveValue(STANDARD);

    await user.selectOptions(selector, CUSTOM);
    await expect(code()).toBe(STANDARD);
    await user.click(footer('Select'));
    await expect(callback).toHaveBeenCalledTimes(1);
    await expect(callback).toHaveBeenCalledWith(STANDARD);
  }
};

export const EachPickerHasItsOwnState: StoryObj = {
  name: 'A change in one picker does not carry into the next',
  render: () => launcher(LAUNCHER),
  play: async ({ canvasElement }) => {
    closeAll();
    await openFrom(canvasElement, TIEBREAK_SETS);
    await user.click(toggleLabel('aggregateOption'));
    await waitFor(() => expect(code()).toBe('SET3A-S:TB11'));
    await user.click(footer('Cancel'));

    await openFrom(canvasElement, TIEBREAK_SETS);
    await expect(el<HTMLInputElement>('aggregateOption')).not.toBeChecked();
    await expect(code()).toBe(TIEBREAK_SETS);
    await user.click(footer('Cancel'));
  }
};

export const RendersAtOnce: StoryObj = {
  name: 'Opening draws the whole picker at once, not after a tick',
  render: () => launcher('Not used: the play opens the picker itself, to look before any task runs'),
  play: async () => {
    closeAll();
    // Called, not clicked, so the assertions below run in the same task as the open.
    getMatchUpFormatModal({ existingMatchUpFormat: 'SET3-S:6/TB7-F:TB10' });
    expect(el('what-1').textContent).toContain('Tiebreak');
    expect(el('setTo-1')).not.toBeVisible();
    expect(el('finalSetFormat')).toBeVisible();
    closeAll();
  }
};
