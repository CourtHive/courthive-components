import { renderForm } from '../components/forms/renderForm';
import { cModal } from '../components/modal/cmodal';
import { waitFor, expect } from 'storybook/test';
import '../components/forms/styles';

/**
 * A scrolling modal body clips absolutely positioned popups, so the datepicker's calendar and a
 * type-ahead's suggestions used to be drawn UNDER the footer. These stories judge each popup by what
 * is drawn at its points (`elementFromPoint`): `toBeVisible` counts a clipped element as visible.
 */

const MODAL = 'section[id^="cmdl-"]';
const OPEN_PICKER = '.datepicker-dropdown.active';
const PLAYERS = Array.from({ length: 12 }, (_, index) => `Player ${String(index + 1).padStart(2, '0')}`);

const topModal = () => [...document.querySelectorAll<HTMLElement>(MODAL)].pop();

function closeAll() {
  for (let attempt = 0; attempt < 6 && document.querySelector(MODAL); attempt += 1) cModal.close();
}

/** True when the point a few pixels inside the given corner of `element` is drawn by `element`. */
function drawnAt(element: Element, x: number, y: number): boolean {
  const hit = document.elementFromPoint(x, y);
  return !!hit && element.contains(hit);
}

function cornersDrawn(element: Element): boolean[] {
  const { left, right, top, bottom } = element.getBoundingClientRect();
  const inset = 4;
  return [
    drawnAt(element, left + inset, top + inset),
    drawnAt(element, right - inset, top + inset),
    drawnAt(element, left + inset, bottom - inset),
    drawnAt(element, right - inset, bottom - inset)
  ];
}

function openFormModal({ spacer }: { spacer?: number } = {}) {
  cModal.open({
    title: 'Popups in a modal',
    content: (body: HTMLElement) => {
      renderForm(body, [
        { label: 'Start date', field: 'startDate', id: 'popupStartDate', date: true },
        { label: 'Player', field: 'player', id: 'popupPlayer', typeAhead: { list: PLAYERS } }
      ]);
      if (spacer) {
        const filler = document.createElement('div');
        filler.style.height = `${spacer}px`;
        body.appendChild(filler);
      }
    },
    buttons: [{ label: 'Close', close: true }]
  });
}

function launcher(label: string, open: () => void): HTMLElement {
  const button = document.createElement('button');
  button.className = 'button is-info';
  button.textContent = label;
  button.onclick = open;
  const container = document.createElement('div');
  container.style.padding = '16px';
  container.appendChild(button);
  return container;
}

export default {
  title: 'Foundations/Modal/Popups',
  tags: ['autodocs']
};

export const PopupsOverTheFooter = {
  render: () => launcher('Open a short modal with a date and a type-ahead', () => openFormModal()),
  play: async () => {
    closeAll();
    openFormModal();
    const modal = topModal()!;
    const footer = modal.querySelector<HTMLElement>('.chc-modal-footer')!;

    // The calendar is taller than this body, so before the fix its lower half sat under the footer.
    const dateInput = modal.querySelector<HTMLInputElement>('#popupStartDate')!;
    dateInput.focus();
    const picker = await waitFor(() => {
      const shown = modal.querySelector<HTMLElement>(OPEN_PICKER);
      if (!shown) throw new Error('the calendar did not open');
      return shown;
    });
    await expect(picker.getBoundingClientRect().bottom, 'the calendar reaches past the body').toBeGreaterThan(
      footer.getBoundingClientRect().top
    );
    await expect(cornersDrawn(picker), 'every corner of the calendar is drawn on top').toEqual([
      true,
      true,
      true,
      true
    ]);
    dateInput.blur();
    picker.classList.remove('active');

    // Twelve suggestions run well past this body's bottom edge.
    const playerInput = modal.querySelector<HTMLInputElement>('#popupPlayer')!;
    playerInput.focus();
    playerInput.value = 'Pl';
    playerInput.dispatchEvent(new Event('input', { bubbles: true }));
    const items = await waitFor(() => {
      const shown = [...modal.querySelectorAll<HTMLElement>('.awesomplete > ul:not([hidden]) > li')];
      // Awesomplete shows at most ten (its `maxItems` default).
      if (shown.length < 10) throw new Error('the suggestions did not open');
      return shown;
    });
    // Awesomplete grows the list from `scale(0)` over 0.3s. A scaled item's centre is still inside the item,
    // so wait until the drawn width equals the layout width (which ignores transforms) before judging.
    const list = items[0].parentElement!;
    await waitFor(
      () =>
        expect(Math.round(list.getBoundingClientRect().width), 'the list has finished growing').toBe(list.offsetWidth),
      { timeout: 2000 }
    );
    const coveredItems = () =>
      items
        .filter((item) => {
          const { left, right, top, bottom } = item.getBoundingClientRect();
          return !drawnAt(item, (left + right) / 2, (top + bottom) / 2);
        })
        .map((item) => item.textContent);
    await expect(coveredItems(), 'every suggestion is drawn on top').toEqual([]);

    // The list hangs from the input, exactly as wide, rather than spanning the viewport.
    const inputRect = playerInput.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    await expect(Math.round(listRect.left)).toBe(Math.round(inputRect.left));
    await expect(Math.round(listRect.width)).toBe(Math.round(inputRect.width));

    closeAll();
  }
};

export const PopupsFollowAScrolledBody = {
  render: () => launcher('Open a tall modal with a date and a type-ahead', () => openFormModal({ spacer: 3000 })),
  play: async () => {
    closeAll();
    openFormModal({ spacer: 3000 });
    const modal = topModal()!;
    const body = modal.querySelector<HTMLElement>('.chc-modal-body')!;
    await expect(body.scrollHeight, 'the body scrolls').toBeGreaterThan(body.clientHeight);

    const dateInput = modal.querySelector<HTMLInputElement>('#popupStartDate')!;
    dateInput.focus();
    const picker = await waitFor(() => {
      const shown = modal.querySelector<HTMLElement>(OPEN_PICKER);
      if (!shown) throw new Error('the calendar did not open');
      return shown;
    });
    const gap = () => picker.getBoundingClientRect().top - dateInput.getBoundingClientRect().bottom;
    const before = gap();
    const inputTop = dateInput.getBoundingClientRect().top;

    body.scrollTop = 30;
    body.dispatchEvent(new Event('scroll'));
    await expect(Math.round(inputTop - dateInput.getBoundingClientRect().top), 'the input moved').toBe(30);
    await expect(Math.abs(gap() - before), 'the calendar moved with its input').toBeLessThan(1);

    closeAll();
  }
};

function openMultiSelectModal() {
  cModal.open({
    title: 'Multi-select in a modal',
    content: (body: HTMLElement) =>
      renderForm(body, [
        {
          label: 'Ratings',
          field: 'ratings',
          id: 'popupRatings',
          multiple: true,
          options: PLAYERS.map((player) => ({ label: player, value: player }))
        }
      ]),
    buttons: [{ label: 'Close', close: true }]
  });
}

export const MultiSelectOverTheFooter = {
  render: () => launcher('Open a short modal with a multi-select', () => openMultiSelectModal()),
  play: async () => {
    closeAll();
    openMultiSelectModal();
    const modal = topModal()!;
    const footer = modal.querySelector<HTMLElement>('.chc-modal-footer')!;
    const panel = modal.querySelector<HTMLElement>('.chc-multi-select-dropdown')!;
    const trigger = panel.previousElementSibling as HTMLElement;

    // Before the fix the body clipped the panel and only its first row showed above the footer.
    trigger.click();
    await expect(panel.getBoundingClientRect().bottom, 'the panel reaches past the body').toBeGreaterThan(
      footer.getBoundingClientRect().top
    );
    const coveredRows = () =>
      [...panel.querySelectorAll<HTMLElement>('label')]
        .filter((row) => {
          const { left, right, top, bottom } = row.getBoundingClientRect();
          const middle = (top + bottom) / 2;
          // Rows past the panel's own max-height are scrolled inside it, not clipped by the body.
          if (middle >= panel.getBoundingClientRect().bottom) return false;
          return !drawnAt(row, (left + right) / 2, middle);
        })
        .map((row) => row.textContent);
    await expect(coveredRows(), 'every visible row is drawn on top').toEqual([]);

    // The panel hangs from the trigger, exactly as wide, and inside the window.
    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    await expect(panelRect.bottom, 'the panel stays inside the window').toBeLessThanOrEqual(window.innerHeight);
    await expect(Math.round(panelRect.top)).toBe(Math.round(triggerRect.bottom));
    await expect(Math.round(panelRect.width)).toBe(Math.round(triggerRect.width));

    closeAll();
  }
};

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

/**
 * The suggestions open where they hang. Fixed inside a modal body, the hidden list waited at Awesomplete's
 * `left: 0` (the viewport's edge) and its every-property transition animated it from there to the input: the
 * choices flew in from the left of the screen. Judged on the first frame, before any animation could finish.
 */
export const SuggestionsOpenWhereTheyHang = {
  render: () => launcher('Open a modal and type in the type-ahead', () => openFormModal()),
  play: async () => {
    closeAll();
    openFormModal();
    const modal = topModal()!;
    const playerInput = modal.querySelector<HTMLInputElement>('#popupPlayer')!;
    playerInput.focus();
    playerInput.value = 'Pl';
    playerInput.dispatchEvent(new Event('input', { bubbles: true }));
    const list = await waitFor(() => {
      const shown = modal.querySelector<HTMLElement>('.awesomplete > ul:not([hidden])');
      if (!shown) throw new Error('the suggestions did not open');
      return shown;
    });
    await nextFrame();
    const inputRect = playerInput.getBoundingClientRect();
    const { left, top } = getComputedStyle(list);
    await expect(Math.round(Number.parseFloat(left)), 'the list is already beside the input').toBe(
      Math.round(inputRect.left)
    );
    await expect(Math.round(Number.parseFloat(top)), 'the list is already under the input').toBe(
      Math.round(inputRect.bottom)
    );
    closeAll();
  }
};

function openFocusModal({ content, autoFocus }: { content: (body: HTMLElement) => void; autoFocus?: boolean }) {
  cModal.open({
    title: 'Focus on open',
    content,
    config: autoFocus === undefined ? undefined : { autoFocus },
    buttons: [{ label: 'Close', close: true }]
  });
}

/**
 * A modal opens with focus on the first control in its body that can be modified or selected: the
 * type-ahead here, past the date field (focus would open its calendar over the dialog). A form that names
 * its own field (`focus: true`) keeps it, and `autoFocus: false` leaves focus where it was.
 */
export const FocusOnOpen = {
  render: () => launcher('Open a modal with a date and a type-ahead', () => openFormModal()),
  play: async () => {
    closeAll();
    const launcherButton = document.createElement('button');
    document.body.appendChild(launcherButton);

    openFormModal();
    await waitFor(() => expect(document.activeElement?.id, 'the type-ahead, past the date').toBe('popupPlayer'));
    closeAll();

    // renderForm's own `focus: true` focuses its field after 200ms, so it lands after this and stands
    openFocusModal({
      content: (body) =>
        renderForm(body, [
          { label: 'First', field: 'first', id: 'focusFirst' },
          { label: 'Second', field: 'second', id: 'focusSecond', focus: true }
        ])
    });
    await waitFor(() => expect(document.activeElement?.id, "the content's own choice stands").toBe('focusSecond'), {
      timeout: 1000
    });
    closeAll();

    launcherButton.focus();
    openFocusModal({
      autoFocus: false,
      content: (body) => renderForm(body, [{ label: 'Only', field: 'only', id: 'focusOnly' }])
    });
    await nextFrame();
    await nextFrame();
    await expect(document.activeElement, 'autoFocus: false takes no focus').toBe(launcherButton);
    closeAll();
    launcherButton.remove();
  }
};
