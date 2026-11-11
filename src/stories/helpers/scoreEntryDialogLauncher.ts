/**
 * A button that opens the score-entry dialog, for the `Scoring/Score Entry/Tests/...` stories.
 *
 * The dialog is a `cModal`, appended to `document.body` rather than to the story's canvas, so a play
 * function opens it the way an operator does — a trusted click on a button — and then reads the TOP
 * modal. What the dialog submitted, and the dialog handle itself, are kept per launcher so a play can
 * assert on the outcome without a host of its own.
 */
import { openScoreEntryDialog } from '../../components/scoring/scoreEntryDialog';
import { cModal } from '../../components/modal/cmodal';
import { user } from './trustedUser';

import type { ScoreEntryDialog, ScoreEntryDialogParams } from '../../components/scoring/scoreEntryDialog';

/** Every `cModal` dialog is a `section` with an id of `cmdl-<n>`. */
export const MODAL = 'section[id^="cmdl-"]';

export type Launched = {
  /** The dialog the last click opened. */
  dialog?: ScoreEntryDialog;
  /** Every outcome Submit reported, oldest first. */
  submitted: any[];
};

const launches = new WeakMap<HTMLElement, Launched>();

/** The newest dialog, since a picker can open a second one on top. */
export const topModal = (): HTMLElement | undefined => [...document.querySelectorAll<HTMLElement>(MODAL)].at(-1);

/** One element in the top dialog. Throws rather than handing a play `null` to assert on. */
export function inModal<T extends HTMLElement>(selector: string): T {
  const found = topModal()?.querySelector<T>(selector);
  if (!found) throw new Error(`nothing in the dialog matched ${selector}`);
  return found;
}

/** Whether the top dialog holds a match — for asserting absence without a throw. */
export const inModalOrNull = <T extends HTMLElement>(selector: string): T | null =>
  topModal()?.querySelector<T>(selector) ?? null;

/** Close anything a previous story left standing. */
export function closeAllModals(): void {
  for (let attempt = 0; attempt < 6 && document.querySelector(MODAL); attempt += 1) cModal.close();
}

/**
 * A launch button. `paramsFor` is read on every click, so reopening starts from the same params. A story
 * that opens several differently configured dialogs renders one launcher per configuration, each with its
 * own `key`, and opens each with `openFrom(canvasElement, key)`.
 */
export function dialogLauncher(
  paramsFor: () => ScoreEntryDialogParams,
  label = 'Open score entry',
  key = 'scoreEntry'
): HTMLElement {
  const launch = document.createElement('button');
  launch.className = 'button';
  launch.dataset.launch = key;
  launch.textContent = label;

  const state: Launched = { submitted: [] };
  launches.set(launch, state);
  launch.addEventListener('click', () => {
    closeAllModals();
    const params = paramsFor();
    state.dialog = openScoreEntryDialog({
      ...params,
      onSubmit: (outcome) => {
        state.submitted.push(outcome);
        params.onSubmit?.(outcome);
      }
    });
  });
  return launch;
}

/** Several launchers side by side, for a story that opens more than one configuration. */
export function launchers(...buttons: HTMLElement[]): HTMLElement {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; padding:16px';
  row.append(...buttons);
  return row;
}

/** Open the dialog from the story's launcher with a trusted click, and return what it records. */
export async function openFrom(canvasElement: HTMLElement, key = 'scoreEntry'): Promise<Launched> {
  const launch = canvasElement.querySelector<HTMLElement>(`button[data-launch="${key}"]`);
  if (!launch) throw new Error(`the story rendered no score-entry launcher "${key}"`);
  await user.click(launch);
  return launches.get(launch)!;
}
