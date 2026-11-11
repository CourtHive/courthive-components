/**
 * Date fields — the picker attaches a tick after render.
 *
 * `vanillajs-datepicker` touches `document` at import, so `renderField` and `renderForm` load it on first use
 * (`helpers/loadDatepicker.ts`) and the picker attaches after they return. These drive the REAL picker, after
 * that load, with trusted input: an initial value is selected once it attaches, a pick lands in the input and
 * the form's value, the handle a form returns forwards to the picker, and a field destroyed (or a form
 * removed) before the load never gets a picker. The rules themselves are unit-tested in node by
 * `helpers/__tests__/loadDatepicker.test.ts`. The date range is driven by the `DateRangeForm` story's play in
 * `renderForm.stories.ts`, and a bare date field by `DatePicker`'s in `renderField.stories.ts`.
 *
 * Run as tests: `pnpm exec vitest run --project storybook src/stories/LazyDatepickerTests.stories.ts`
 */
import '../components/forms/styles';
import { openDatepicker, pickDay, datepickerFor } from './helpers/datepickerHelpers';
import { renderField } from '../components/forms/renderField';
import { renderForm } from '../components/forms/renderForm';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, waitFor } from 'storybook/test';
import { user } from './helpers/trustedUser';

const meta: Meta = {
  title: 'Foundations/Forms/Tests/Date Pickers',
  tags: ['!dev']
};
export default meta;

let formInputs: any;

export const PickAndInitialValue: StoryObj = {
  name: 'a pick reaches the input and the form; an initial value is selected once the picker attaches',
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding: 24px; max-width: 360px; min-height: 420px;';
    formInputs = renderForm(wrap, [
      { label: 'Played on', field: 'playedOn', id: 'playedOn', date: true, placeholder: 'YYYY-MM-DD' },
      { label: 'Starts', field: 'starts', id: 'starts', date: true, value: '2026-03-10' }
    ]);
    return wrap;
  },
  play: async () => {
    const playedOn = formInputs.playedOn as HTMLInputElement;
    const starts = formInputs.starts as HTMLInputElement;

    // The initial value: the picker read it when it attached, so it opens on March 2026 with the 10th selected.
    const startsPicker = await openDatepicker(starts);
    await expect(startsPicker.querySelector('.view-switch')?.textContent).toBe('March 2026');
    await expect(startsPicker.querySelector('.datepicker-cell.day.selected')?.textContent?.trim()).toBe('10');
    const startsDate = formInputs['starts.date'].getDate() as Date;
    await expect([startsDate.getFullYear(), startsDate.getMonth(), startsDate.getDate()]).toEqual([2026, 2, 10]);

    // A real pick, on a field with no value: it lands in the input, which is what the form reports.
    const picker = await openDatepicker(playedOn);
    const expected = await pickDay(picker, 15);
    await waitFor(() => expect(playedOn.value).toBe(expected));
    await expect(formInputs.playedOn.value).toBe(expected);
    // autohide: one date picked closes the picker.
    await waitFor(() => expect(picker).not.toBeVisible());
    // The handle the form returned IS the picker now.
    await expect((formInputs['playedOn.date'].getDate() as Date).getDate()).toBe(15);
    await expect(formInputs['playedOn.date'].instance).toBe((playedOn as any).datepicker);
  }
};

const PICKER = '.datepicker';

let destroyedField: HTMLElement;
let removedForm: HTMLElement;

export const DestroyedBeforeLoad: StoryObj = {
  name: 'a field destroyed, or a form removed, before the picker loads never gets a picker',
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding: 24px; max-width: 360px;';

    // Synchronously, before the import can resolve: the window the guard exists for.
    const destroyed = renderField({ label: 'Destroyed', field: 'destroyed', id: 'destroyed', date: true });
    destroyed.datepicker.destroy();
    destroyedField = destroyed.field;

    // A form rendered and removed at once (a drawer closed as it opened).
    removedForm = document.createElement('div');
    renderForm(removedForm, [{ label: 'Removed', field: 'removed', id: 'removed', date: true }]);
    wrap.appendChild(removedForm);
    removedForm.remove();

    // CONTROL: rendered the same way and kept, so "no picker" cannot mean "the picker never loaded".
    const control = renderField({ label: 'Control', field: 'control', id: 'control', date: true });
    wrap.append(destroyed.field, control.field);
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const control = canvasElement.querySelector<HTMLInputElement>('#control')!;
    await waitFor(() => expect(datepickerFor(control)).not.toBeNull());

    await expect(destroyedField.querySelector(PICKER)).toBeNull();
    await expect(removedForm.querySelector(PICKER)).toBeNull();
    await expect(document.querySelectorAll(PICKER)).toHaveLength(1);

    // The destroyed field is still a usable plain input: clicking into it opens nothing.
    const destroyedInput = destroyedField.querySelector<HTMLInputElement>('#destroyed')!;
    await user.click(destroyedInput);
    await expect(document.activeElement).toBe(destroyedInput);
    await expect((destroyedInput as any).datepicker).toBeUndefined();
    await expect(document.querySelectorAll(PICKER)).toHaveLength(1);
  }
};
