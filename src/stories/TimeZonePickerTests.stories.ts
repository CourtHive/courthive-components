/**
 * Time zone picker — play tests (CA, 2026-11-17).
 *
 * A director finds a zone by what it is called (city, zone name, country, offset) or on the world map, and the
 * form still reads the IANA id. Before, the field was a type-ahead over raw ids (`America/New_York`).
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories src/stories/TimeZonePickerTests.stories.ts`
 */
import '../components/forms/styles';
import { createTimeZonePicker } from '../components/timezone-picker/timeZonePicker';
import { ZONE_LOCATIONS } from '../components/timezone-picker/data/zoneLocations';
import { MAP_HEIGHT, MAP_WIDTH } from '../components/timezone-picker/data/worldMap';
import { renderForm } from '../components/forms/renderForm';
import { cModal } from '../components/modal/cmodal';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { user } from './helpers/trustedUser';

const meta: Meta = {
  title: 'Foundations/Forms/Time Zone Picker/Tests',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const SEARCH = '.chc-tz-search';
const VALUE = '.chc-tz-value';
const LIST = '.chc-tz-list';
const MAP_SVG = '.chc-tz-map-svg';
const PARIS = 'Europe/Paris';

function frame(content: HTMLElement): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = 'width: 440px; margin: 20px; min-height: 460px;';
  root.appendChild(content);
  return root;
}

const pick = (canvas: HTMLElement) => ({
  search: canvas.querySelector<HTMLInputElement>(SEARCH)!,
  value: canvas.querySelector<HTMLInputElement>(VALUE)!,
  list: canvas.querySelector<HTMLUListElement>(LIST)!
});

export const SearchByCityAndPickWithTheKeyboard: StoryObj = {
  args: { onChange: fn() },
  render: ({ onChange }) => frame(createTimeZonePicker({ locale: 'en-US', onChange, showMap: false }).element),
  play: async ({ canvasElement, args }) => {
    const { search, value, list } = pick(canvasElement);
    await user.click(search);
    await expect(list).toBeVisible();
    await user.type(search, 'new york');
    await expect(list.querySelector('.chc-tz-option.is-active .chc-tz-city')).toHaveTextContent('New York');
    await expect(list.querySelector('.chc-tz-option.is-active .chc-tz-meta')).toHaveTextContent('Eastern Time');
    await user.keyboard('{Enter}');
    await expect(value.value).toBe('America/New_York');
    await expect(args.onChange).toHaveBeenCalledWith('America/New_York');
    await expect(search.value).toMatch(/^New York · Eastern Time \(UTC−[45]\)$/);
    await expect(list).not.toBeVisible();
  }
};

export const SearchByOffset: StoryObj = {
  render: () => frame(createTimeZonePicker({ locale: 'en-US', showMap: false }).element),
  play: async ({ canvasElement }) => {
    const { search, value } = pick(canvasElement);
    await user.click(search);
    await user.type(search, '+5:45');
    await user.keyboard('{Enter}');
    // Chromium still names the zone by its old alias; the value is the browser's id, the box shows today's city
    await expect(value.value).toMatch(/^Asia\/Kath?mandu$/);
    await expect(search.value).toMatch(/^Kathmandu · /);
  }
};

export const EscapePutsTheZoneBack: StoryObj = {
  render: () => frame(createTimeZonePicker({ value: PARIS, locale: 'en-US', showMap: false }).element),
  play: async ({ canvasElement }) => {
    const { search, value, list } = pick(canvasElement);
    const shown = search.value;
    await expect(shown).toContain('Paris');
    await user.click(search);
    await user.type(search, 'tokyo');
    await user.keyboard('{Escape}');
    await expect(list).not.toBeVisible();
    await expect(search.value).toBe(shown);
    await expect(value.value).toBe(PARIS);
  }
};

export const ClearingTheBoxClearsTheZone: StoryObj = {
  render: () => frame(createTimeZonePicker({ value: PARIS, locale: 'en-US', showMap: false }).element),
  play: async ({ canvasElement }) => {
    const { search, value, list } = pick(canvasElement);
    await user.click(search);
    await user.clear(search);
    await user.tab();
    await expect(list).not.toBeVisible();
    await expect(value.value).toBe('');
  }
};

export const PickOnTheMap: StoryObj = {
  render: () => frame(createTimeZonePicker({ locale: 'en-US' }).element),
  play: async ({ canvasElement }) => {
    const svg = await waitFor(() => {
      const element = canvasElement.querySelector<SVGSVGElement>(MAP_SVG);
      if (!element) throw new Error('map not rendered yet');
      return element;
    });
    const box = svg.getBoundingClientRect();
    const [x, y] = ZONE_LOCATIONS[PARIS];
    await user.clickAt(svg as unknown as HTMLElement, {
      x: (x / MAP_WIDTH) * box.width,
      y: (y / MAP_HEIGHT) * box.height
    });
    const { search, value } = pick(canvasElement);
    await expect(value.value).toBe(PARIS);
    await expect(search.value).toContain('Paris');
    // the chosen zone's band is shaded
    await expect(svg.querySelector<SVGPathElement>('.chc-tz-band.is-selected')?.dataset.offset).toBe('1');
  }
};

export const MapToggles: StoryObj = {
  render: () => frame(createTimeZonePicker({ locale: 'en-US', showMap: false }).element),
  play: async ({ canvasElement }) => {
    const toggle = canvasElement.querySelector<HTMLButtonElement>('.chc-tz-map-toggle')!;
    const map = canvasElement.querySelector<HTMLElement>('.chc-tz-map')!;
    await expect(map).not.toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    await expect(map).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  }
};

export const AsAFormField: StoryObj = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = 'width: 440px; margin: 20px; min-height: 460px;';
    const inputs = renderForm(root, [
      {
        label: 'Time zone',
        field: 'localTimeZone',
        value: 'Asia/Kolkata',
        timeZone: { locale: 'en-US', showMap: false }
      }
    ]);
    (root as any).inputs = inputs;
    return root;
  },
  play: async ({ canvasElement }) => {
    const root = canvasElement.firstElementChild as any;
    const { localTimeZone } = root.inputs;
    // the form reads the IANA id, as it did from the type-ahead
    await expect(localTimeZone.value).toBe('Asia/Kolkata');
    // and the field is the input's ancestor, so a host can hang a hint on it (TMX's editDatesModal does)
    await expect(localTimeZone.closest('.field')).not.toBeNull();
    const { search } = pick(canvasElement);
    await expect(search.value).toMatch(/^Kolkata · India Standard Time \(UTC\+5:30\)$/);
    await user.click(search);
    await user.type(search, 'sydney');
    await user.keyboard('{Enter}');
    await expect(localTimeZone.value).toBe('Australia/Sydney');
  }
};

// In a modal the body scrolls and clips what is absolutely positioned inside it: the list was cut off under the
// footer, as the type-ahead it replaced had been (journey 161). The modal places it fixed below the search box.
export const InAModalTheListIsDrawnOverTheFooter: StoryObj = {
  render: () => {
    const root = document.createElement('div');
    root.style.cssText = 'min-height: 200px;';
    return root;
  },
  play: async () => {
    const closeAll = () => {
      for (let attempt = 0; attempt < 6 && document.querySelector('.chc-modal-dialog'); attempt += 1) cModal.close();
    };
    closeAll();
    try {
      cModal.open({
        title: 'Edit Dates',
        content: (elem: HTMLElement) => {
          // fields above push the time zone field to the bottom of the body, against the footer
          const filler = document.createElement('div');
          filler.style.height = '320px';
          elem.appendChild(filler);
          renderForm(elem, [
            { label: 'Time zone', field: 'localTimeZone', timeZone: { locale: 'en-US', showMap: false } }
          ]);
        },
        buttons: [{ label: 'Cancel' }]
      } as any);
      const dialog = await waitFor(() => {
        const element = document.querySelector<HTMLElement>('.chc-modal-dialog');
        if (!element) throw new Error('modal not open');
        return element;
      });
      const search = dialog.querySelector<HTMLInputElement>(SEARCH)!;
      await user.click(search);
      const list = dialog.querySelector<HTMLUListElement>(LIST)!;
      await expect(list).toBeVisible();
      // the rows the list shows: it scrolls its own rows, so one below its bottom edge is hidden by design
      const box = list.getBoundingClientRect();
      const rows = [...list.querySelectorAll<HTMLElement>('.chc-tz-option')].filter((row) => {
        const { top, bottom } = row.getBoundingClientRect();
        return (top + bottom) / 2 < box.bottom;
      });
      await expect(rows.length).toBeGreaterThanOrEqual(3);
      const covered = rows.filter((row) => {
        const { left, right, top, bottom } = row.getBoundingClientRect();
        const drawn = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
        return !drawn || !row.contains(drawn);
      });
      await expect(covered.map((row) => row.textContent)).toEqual([]);
    } finally {
      closeAll();
    }
  }
};
