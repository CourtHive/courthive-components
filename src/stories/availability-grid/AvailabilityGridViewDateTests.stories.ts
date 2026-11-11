/**
 * Availability Grid — the toolbar's view date, whose picker attaches a tick after render.
 *
 * `vanillajs-datepicker` touches `document` at import, so the grid loads it on first use
 * (`helpers/loadDatepicker.ts`) and its view-date picker attaches after `createAvailabilityGrid` returns.
 * These drive the REAL picker after that load: picking a day moves the view to it, and a grid destroyed
 * before the load never constructs a picker. The grid is created inside `play`, into a host already in the
 * document, so the picker takes the attach-at-load path rather than waiting for the input to take focus.
 *
 * Run as tests:
 * `pnpm exec vitest run --project storybook src/stories/availability-grid/AvailabilityGridViewDateTests.stories.ts`
 */
import '../../components/availability-grid/ui/styles.css';
import 'vanillajs-datepicker/css/datepicker.css';
import { createAvailabilityGrid } from '../../components/availability-grid/ui/availabilityGrid';
import { openDatepicker, pickDay, datepickerFor } from '../helpers/datepickerHelpers';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { mocksEngine } from 'tods-competition-factory';
import { expect, waitFor } from 'storybook/test';

const meta: Meta = {
  title: 'Scheduling/Availability Grid/Tests/View Date',
  tags: ['!dev']
};
export default meta;

const FIRST_DAY = '2026-06-15';
const PICKED_DAY = '2026-06-17';
const DATE_INPUT = '.tg-view-toolbar-date';
const PICKER = '.datepicker';

function tournamentRecord() {
  const { tournamentRecord } = mocksEngine.generateTournamentRecord({
    venueProfiles: [{ venueId: 'venue-main', venueName: 'Main', courtsCount: 4, startTime: '08:00', endTime: '20:00' }],
    startDate: FIRST_DAY,
    endDate: '2026-06-19',
    nonRandom: 1
  });
  return tournamentRecord;
}

const host = () => {
  const element = document.createElement('div');
  element.style.cssText = 'width: 1000px; height: 560px;';
  return element;
};

const shownDays = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('.tg-day-axis [data-day]')].map((tick) => tick.dataset.day);

export const PickingADateMovesTheView: StoryObj = {
  name: 'picking a day in the view-date picker moves the grid to that day',
  render: host,
  play: async ({ canvasElement }) => {
    const grid = createAvailabilityGrid({ tournamentRecord: tournamentRecord(), initialDay: FIRST_DAY }, canvasElement);
    const dateInput = canvasElement.querySelector<HTMLInputElement>(DATE_INPUT)!;

    await expect(grid.getControl()?.getDay()).toBe(FIRST_DAY);
    await waitFor(() => expect(shownDays(canvasElement)).toEqual([FIRST_DAY]));

    const picker = await openDatepicker(dateInput);
    // The initial day reached the picker when it attached, from the input the toolbar had already set.
    await expect(picker.querySelector('.datepicker-cell.day.selected')?.textContent?.trim()).toBe('15');
    await pickDay(picker, 17);

    await waitFor(() => expect(grid.getControl()?.getDay()).toBe(PICKED_DAY));
    await expect(dateInput.value).toBe(PICKED_DAY);
    await waitFor(() => expect(shownDays(canvasElement)).toEqual([PICKED_DAY]));
    grid.destroy();
  }
};

export const DestroyedBeforeLoad: StoryObj = {
  name: 'a grid destroyed before the picker loads never constructs one',
  render: host,
  play: async ({ canvasElement }) => {
    const destroyedHost = canvasElement.appendChild(host());
    const destroyed = createAvailabilityGrid({ tournamentRecord: tournamentRecord() }, destroyedHost);
    const destroyedInput = destroyedHost.querySelector<HTMLInputElement>(DATE_INPUT)!;
    // Synchronously, before the import can resolve: the window the guard exists for.
    destroyed.destroy();

    // CONTROL: the same grid, kept, does get its picker — so "none" cannot mean "the picker never loaded".
    const controlHost = canvasElement.appendChild(host());
    const control = createAvailabilityGrid({ tournamentRecord: tournamentRecord() }, controlHost);
    const controlInput = controlHost.querySelector<HTMLInputElement>(DATE_INPUT)!;
    await waitFor(() => expect(datepickerFor(controlInput)).not.toBeNull());

    await expect((destroyedInput as any).datepicker).toBeUndefined();
    await expect(destroyedHost.querySelector(PICKER)).toBeNull();
    await expect(document.querySelectorAll(PICKER)).toHaveLength(1);
    control.destroy();
    await expect(document.querySelectorAll(PICKER)).toHaveLength(0);
    // Not only gone with its root: destroyed, which unbinds it from the input and drops its document listeners.
    await expect((controlInput as any).datepicker).toBeUndefined();
  }
};
