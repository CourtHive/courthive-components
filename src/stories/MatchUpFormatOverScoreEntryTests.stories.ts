/**
 * The format picker as the score-entry dialog opens it — CA, 2026-10-08, a screenshot of the picker over
 * the score-entry dialog: the dialog stayed live under it, and the picker's red tiebreak toggle and blue
 * Select clashed with the dialog's teal.
 *
 * Both are things a browser shows and a class name does not, so they are asserted as painted: every
 * accent the picker draws is the computed `--chc-card-accent`, and the dialog underneath cannot take
 * focus while the picker is open and gets itself back however the picker closes. Moved from the retired
 * happy-dom `formatModalMatchesScoreEntry.test.ts`, which checked only that the scoping class was there.
 */
import { openScoreEntryDialog } from '../components/scoring/scoreEntryDialog';
import { expect, fn, waitFor } from 'storybook/test';
import { cModal } from '../components/modal/cmodal';
import { user } from './helpers/trustedUser';

import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Scoring/MatchUp Format/Tests/Over Score Entry',
  tags: ['!dev']
};
export default meta;

const MODAL = 'section[id^="cmdl-"]';
const CARD = '[data-component="scoreEntryCard"]';
const FORMAT = 'SET3-S:6/TB7';
const PICKER = '.chc-modal-dialog.chc-mfc-modal';
const CHIP = 'button[data-action="editFormat"]';

function closeAll(): void {
  for (let attempt = 0; attempt < 6 && document.querySelector(MODAL); attempt += 1) cModal.close();
}

const sections = () => [...document.querySelectorAll<HTMLElement>(MODAL)];
const cardSection = () => document.querySelector<HTMLElement>(CARD)!.closest<HTMLElement>(MODAL)!;
const picker = () => document.querySelector<HTMLElement>(PICKER);

function footer(label: string): HTMLButtonElement {
  const button = [...picker()!.querySelectorAll<HTMLButtonElement>('.chc-modal-footer button')].find(
    (candidate) => candidate.textContent?.trim() === label
  );
  if (!button) throw new Error(`no ${label} button in the picker's footer`);
  return button;
}

/** The colour a declaration resolves to where `scope` is, read back from a probe painted with it. */
function resolved(scope: HTMLElement, declaration: string): string {
  const probe = document.createElement('span');
  probe.style.cssText = `position:absolute; visibility:hidden; background-color:${declaration}`;
  scope.appendChild(probe);
  const colour = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return colour;
}

function openDialog(onFormatChange = fn()) {
  closeAll();
  openScoreEntryDialog({
    sides: [{ participantName: 'Rosalind Lem' }, { participantName: 'Derrick Ellul' }],
    matchUpFormat: FORMAT,
    onFormatChange,
    onSubmit: fn()
  } as any);
  return onFormatChange;
}

async function openPicker(): Promise<void> {
  await user.click(cardSection().querySelector<HTMLButtonElement>(CHIP)!);
  await waitFor(() => expect(picker()).toBeVisible());
  await expect(sections(), 'the picker is a second modal on top of the card').toHaveLength(2);
}

export const PaintedInTheCardAccent: StoryObj = {
  name: "The picker's accents are the score-entry card's",
  render: () => document.createElement('div'),
  play: async () => {
    openDialog();
    await openPicker();
    const dialog = picker()!;
    const accent = resolved(dialog, 'var(--chc-card-accent)');
    await expect(accent, 'control: the token resolves to a colour').not.toBe('rgba(0, 0, 0, 0)');

    // The tiebreak toggle is on for this format; its switch track is the label's ::before.
    const tiebreak = document.getElementById('setTiebreak') as HTMLInputElement;
    await expect(tiebreak, 'control: the tiebreak toggle is on').toBeChecked();
    const track = getComputedStyle(document.querySelector('label[for="setTiebreak"]')!, '::before');
    await expect(track.backgroundColor).toBe(accent);

    const select = footer('Select');
    await expect(getComputedStyle(select).backgroundColor).toBe(accent);
    await expect(getComputedStyle(document.getElementById('matchUpFormatString')!).color).toBe(accent);

    // control: the same button outside the picker is a different colour, so the match above is the
    // picker's scoping and not every info button.
    const outside = document.createElement('button');
    outside.className = 'button is-info';
    outside.textContent = 'unscoped';
    document.body.appendChild(outside);
    const unscoped = getComputedStyle(outside).backgroundColor;
    outside.remove();
    await expect(unscoped).not.toBe(accent);

    await user.click(footer('Cancel'));
    closeAll();
  }
};

export const CardIsInertUnderThePicker: StoryObj = {
  name: 'The card cannot be reached while the picker is open, and comes back however it closes',
  render: () => document.createElement('div'),
  play: async () => {
    for (const closeWith of ['Cancel', 'Select']) {
      const onFormatChange = openDialog();
      const chip = cardSection().querySelector<HTMLButtonElement>(CHIP)!;
      await expect(cardSection().inert, 'control: the card is live before the picker opens').toBe(false);

      await openPicker();
      await expect(cardSection().inert).toBe(true);
      // An inert subtree cannot take focus, which is what keeps keyboard and pointer out of it.
      chip.focus();
      await expect(document.activeElement).not.toBe(chip);

      if (closeWith === 'Select') {
        await user.click(document.getElementById('setTo')!);
        const four = await waitFor(() => {
          const item = [...document.querySelectorAll<HTMLElement>('.dropdown.is-active .dropdown-menu > div')].find(
            (candidate) => candidate.textContent === '4'
          );
          expect(item).toBeTruthy();
          return item!;
        });
        await user.click(four);
      }
      await user.click(footer(closeWith));
      await waitFor(() => expect(sections()).toHaveLength(1));
      await expect(cardSection().inert, `${closeWith} gives the card back`).toBe(false);
      // Queried again: a changed format redraws the card's header, chip included.
      const chipAfter = cardSection().querySelector<HTMLButtonElement>(CHIP)!;
      chipAfter.focus();
      await expect(document.activeElement, `${closeWith}: the card takes focus again`).toBe(chipAfter);
      if (closeWith === 'Select') {
        await expect(onFormatChange).toHaveBeenCalledTimes(1);
        await expect(onFormatChange).toHaveBeenCalledWith('SET3-S:4/TB7');
      } else {
        await expect(onFormatChange).not.toHaveBeenCalled();
      }
      closeAll();
    }
  }
};
