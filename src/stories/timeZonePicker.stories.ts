import '../components/forms/styles';
import { createTimeZonePicker } from '../components/timezone-picker/timeZonePicker';
import { renderField } from '../components/forms/renderField';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Foundations/Forms/Time Zone Picker',
  tags: ['autodocs']
};
export default meta;

function frame(content: HTMLElement): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'max-width: 440px; margin: 20px; min-height: 420px;';
  root.appendChild(content);
  return root;
}

/** The picker on its own: search by city, zone name, country or offset, or pick on the map. */
export const Picker: StoryObj = {
  args: { value: 'America/New_York', locale: '', showMap: true },
  render: ({ value, locale, showMap }) => {
    const readout = document.createElement('p');
    readout.style.cssText = 'margin-top: 0.75em; font-family: monospace;';
    const picker = createTimeZonePicker({
      value,
      locale: locale || undefined,
      showMap,
      placeholder: 'Search a city, country or offset',
      onChange: (timeZone) => (readout.textContent = `value: ${timeZone || '(none)'}`)
    });
    readout.textContent = `value: ${picker.getValue() || '(none)'}`;
    const root = frame(picker.element);
    root.appendChild(readout);
    return root;
  }
};

/** In French: zone and country names come from the browser, in the locale asked for. */
export const French: StoryObj = {
  render: () => frame(createTimeZonePicker({ value: 'Europe/Paris', locale: 'fr' }).element)
};

/** As a form field: `renderField({ field, timeZone: true })`; `inputs[field].value` is the IANA id. */
export const FormField: StoryObj = {
  render: () =>
    frame(renderField({ label: 'Time zone', field: 'localTimeZone', value: 'Asia/Kolkata', timeZone: true }).field)
};
