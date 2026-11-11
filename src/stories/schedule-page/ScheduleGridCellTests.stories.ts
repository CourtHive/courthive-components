/**
 * Schedule grid cell — reserved and blocked cells, booking-type colour, and the time field's DOM.
 *
 * Moved from happy-dom. The DRYING tests there asserted only `data-booking-type`, while the point of the
 * attribute is that schedule-grid-cell.css keys the teal colour off it: a selector typo, or a token that
 * is not defined in one theme, left them green. Here the paint is read with `getComputedStyle`, in light
 * and in dark, against the `--sp-info-text` token itself.
 *
 * The words the time field shows are unit-tested in `__tests__/scheduleGridCell.test.ts`
 * (`timeModifierLabels`).
 *
 * Run as tests: `pnpm test:stories src/stories/schedule-page/ScheduleGridCellTests.stories.ts`
 */
import { buildScheduleGridCell } from '../../components/schedule-page';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { applyThemePalette } from '../../theme/palettes';
import { expect } from 'storybook/test';

const meta: Meta = {
  title: 'Scheduling/Schedule Page/Grid Cell/Tests/Reserved, Blocked and Time',
  tags: ['!dev']
};
export default meta;

const RESERVED_TYPE = '.spl-grid-cell__reserved-type';
const BLOCK_TYPE = '.spl-grid-cell__block-type';
const CELL_STYLE = 'width: 160px; height: 72px;';

function cellHost(cells: Record<string, HTMLElement>): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display: flex; flex-wrap: wrap; gap: 12px; padding: 16px; background: var(--sp-bg);';
  for (const [name, cell] of Object.entries(cells)) {
    cell.dataset.testCell = name;
    cell.style.cssText += CELL_STYLE;
    wrap.appendChild(cell);
  }
  return wrap;
}

const find = (root: HTMLElement, name: string) => root.querySelector<HTMLElement>(`[data-test-cell="${name}"]`)!;

export const ReservedCell: StoryObj = {
  render: () =>
    cellHost({
      labelled: buildScheduleGridCell({
        matchUpId: '',
        isReserved: true,
        reservation: { tournamentName: 'City Open', scheduledTime: '14:00' }
      }),
      // A reserved slot is not the viewer's matchUp, even when a matchUpId is present.
      opaque: buildScheduleGridCell({
        matchUpId: 'M1',
        isReserved: true,
        sides: [{ participantName: 'Should Not Render' }] as any
      }),
      fallback: buildScheduleGridCell({ matchUpId: '', isReserved: true, schedule: { scheduledTime: '09:30' } })
    }),
  play: async ({ canvasElement }) => {
    const labelled = find(canvasElement, 'labelled');
    await expect(labelled.classList.contains('spl-cell--reserved')).toBe(true);
    await expect(labelled.dataset.reserved).toBe('true');
    await expect(labelled.querySelector(RESERVED_TYPE)).toBeVisible();
    await expect(labelled.querySelector(RESERVED_TYPE)?.textContent).toBe('Reserved');
    await expect(labelled.querySelector('.spl-grid-cell__reserved-name')?.textContent).toBe('City Open');
    await expect(labelled.querySelector('.spl-grid-cell__reserved-time')?.textContent).toBe('14:00');

    const opaque = find(canvasElement, 'opaque');
    await expect(opaque.classList.contains('spl-cell--reserved')).toBe(true);
    await expect(opaque.textContent).not.toContain('Should Not Render');
    await expect(opaque.querySelector('.spl-grid-cell__time, .spl-grid-cell__participants')).toBeNull();

    const fallback = find(canvasElement, 'fallback');
    await expect(fallback.querySelector(RESERVED_TYPE)?.textContent).toBe('Reserved');
    await expect(fallback.querySelector('.spl-grid-cell__reserved-time')?.textContent).toBe('09:30');
    await expect(fallback.querySelector('.spl-grid-cell__reserved-name')).toBeNull();
  }
};

const blocked = (bookingType?: string) =>
  buildScheduleGridCell({ matchUpId: '', isBlocked: true, booking: bookingType ? { bookingType } : {} } as any);

/** What `var(--sp-info-text)` resolves to on this page right now, as a computed colour. */
function tokenColour(host: HTMLElement, token: string): string {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  host.appendChild(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

const labelColour = (cell: HTMLElement) => getComputedStyle(cell.querySelector<HTMLElement>(BLOCK_TYPE)!).color;
const stripe = (cell: HTMLElement) => getComputedStyle(cell).backgroundImage;
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

export const BlockedBookingTypes: StoryObj = {
  render: () => cellHost({ drying: blocked('DRYING'), maintenance: blocked('MAINTENANCE'), untyped: blocked() }),
  play: async ({ canvasElement }) => {
    const drying = find(canvasElement, 'drying');
    const maintenance = find(canvasElement, 'maintenance');
    const untyped = find(canvasElement, 'untyped');

    await expect(drying.classList.contains('spl-cell--blocked')).toBe(true);
    await expect(drying.dataset.bookingType).toBe('DRYING');
    await expect(drying.querySelector(BLOCK_TYPE)?.textContent).toBe('DRYING');
    await expect(drying.querySelector(BLOCK_TYPE)).toBeVisible();
    await expect(maintenance.dataset.bookingType).toBe('MAINTENANCE');
    await expect(untyped.dataset.bookingType).toBe('BLOCKED');

    const root = document.documentElement;
    const previous = { theme: root.dataset.theme, palette: root.dataset.palette };
    const painted: Record<string, string> = {};
    try {
      for (const mode of ['light', 'dark'] as const) {
        root.dataset.theme = mode;
        applyThemePalette(mode);
        await nextFrame();

        const teal = tokenColour(canvasElement, '--sp-info-text');
        painted[mode] = teal;
        // DRYING paints its label in the info token, not the maintenance amber it would fall through to.
        await expect(labelColour(drying)).toBe(teal);
        await expect(labelColour(drying)).not.toBe(labelColour(maintenance));
        await expect(stripe(drying)).toContain('gradient');
        await expect(stripe(drying)).not.toBe(stripe(maintenance));
        // Teal: green and blue both well above red.
        const [r, g, b] = teal.match(/\d+/g)!.map(Number);
        await expect(g).toBeGreaterThan(r + 40);
        await expect(b).toBeGreaterThan(r + 40);
      }
      // The token is themed, so the label follows the mode rather than one fixed colour.
      await expect(painted.dark).not.toBe(painted.light);
    } finally {
      if (previous.theme === undefined) delete root.dataset.theme;
      else root.dataset.theme = previous.theme;
      if (previous.palette === undefined) delete root.dataset.palette;
      else root.dataset.palette = previous.palette;
    }
  }
};

const timed = (schedule: any, timeModifierLabels?: Record<string, { label: string; short?: string }>) =>
  buildScheduleGridCell({ matchUpId: 'M1', schedule }, { header: ['time'], body: [], footer: [], timeModifierLabels });

export const TimeField: StoryObj = {
  render: () =>
    cellHost({
      combined: timed({
        timeModifiers: ['NOT_BEFORE', 'AFTER_REST'],
        scheduledTime: '11:00',
        courtAnnotation: 'Court <B>'
      }),
      rtl: timed({ timeModifiers: ['NOT_BEFORE'], startTime: '11:00' }, { NOT_BEFORE: { label: 'ليس قبل' } }),
      future: timed({ timeModifiers: ['WEATHER_HOLD'], courtAnnotation: 'NOT_BEFORE court inspection' }),
      noteOnly: timed({ courtAnnotation: 'Court 3 if free' }),
      empty: timed({})
    }),
  play: async ({ canvasElement }) => {
    const time = (name: string) => find(canvasElement, name).querySelector<HTMLElement>('.spl-grid-cell__time');

    const combined = time('combined')!;
    await expect(combined).toBeVisible();
    await expect(combined.textContent).toBe('NB · After rest 11:00 Court <B>');
    await expect(combined.title).toBe('Not Before · After rest · 11:00 · Court <B>');
    await expect(combined.getAttribute('aria-label')).toBe(combined.title);
    await expect(combined.getAttribute('role')).toBe('note');
    // The note is text: `<B>` is two characters, not a bold element.
    await expect(combined.querySelector('b')).toBeNull();

    const rtl = time('rtl')!;
    await expect(rtl.textContent).toBe('ليس قبل 11:00');
    await expect(rtl.querySelector('bdi')?.dir).toBe('ltr');
    await expect(rtl.querySelector('bdi')?.textContent).toBe('11:00');

    const future = time('future')!;
    await expect(future.textContent).toBe('Weather hold NOT_BEFORE court inspection');
    await expect(future.querySelector('.spl-grid-cell__court-annotation')?.textContent).toBe(
      ' NOT_BEFORE court inspection'
    );

    await expect(time('noteOnly')?.textContent?.trim()).toBe('Court 3 if free');
    await expect(time('empty')).toBeNull();
  }
};
