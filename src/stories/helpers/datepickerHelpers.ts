/**
 * Reading and driving a real `vanillajs-datepicker` from a play function, through trusted input only.
 *
 * In input mode the picker inserts its element right after the input it is bound to, so each input's picker is
 * found from the input, not by a page-wide query — a page can hold several.
 */
import { expect, waitFor } from 'storybook/test';
import { user } from './trustedUser';

export const datepickerFor = (input: HTMLElement): HTMLElement | null =>
  input.parentElement?.querySelector<HTMLElement>(':scope > .datepicker') ?? null;

/** Click into the input the way a user does and wait for its picker to be on screen. */
export async function openDatepicker(input: HTMLElement): Promise<HTMLElement> {
  await user.click(input);
  await waitFor(() => expect(datepickerFor(input)).toBeVisible());
  return datepickerFor(input)!;
}

/** Click a day of the month the picker shows; returns that day as `yyyy-mm-dd`. */
export async function pickDay(picker: HTMLElement, day: number): Promise<string> {
  const cells = [...picker.querySelectorAll<HTMLElement>('.datepicker-cell.day:not(.prev):not(.next)')];
  const cell = cells.find((candidate) => candidate.textContent?.trim() === String(day));
  if (!cell) throw new Error(`no day ${day} in the month the picker shows`);
  const date = new Date(Number(cell.dataset.date));
  const iso = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
  await user.click(cell);
  return iso;
}
