/**
 * Composition Editor Stories
 * Full-access editor for all Configuration fields with live matchUp preview.
 */
import { createCompositionEditor } from '../components/composition-editor/compositionEditor';
import { compositions } from '../compositions/compositions';
import { expect } from 'storybook/test';
import '../components/forms/styles';

const DESC_COLOR = 'var(--chc-text-secondary, #666)';

export default {
  title: 'Policies & Setup/Composition/Editor',
  tags: ['autodocs']
};

/**
 * Default — starts with Australian composition
 */
export const Default = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '1em';
    // no fixed height: the editor grows as sections open, so new content is visible without scrolling a panel
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    const title = document.createElement('h2');
    title.textContent = 'Composition Editor';
    title.style.marginBottom = '0.5em';
    container.appendChild(title);

    const editorContainer = document.createElement('div');
    editorContainer.style.flex = '1';
    editorContainer.style.minHeight = '0';
    container.appendChild(editorContainer);

    const editor = createCompositionEditor(editorContainer, {
      composition: compositions.Australian,
      compositionName: 'Australian',
      onChange: (comp) => {
        console.log('[CompositionEditor] onChange:', comp);
      },
      onSave: (saved) => {
        console.log('[CompositionEditor] onSave:', saved);
      }
    });

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'button is-info';
    saveBtn.textContent = 'Get Composition (console)';
    saveBtn.style.marginTop = '0.5em';
    saveBtn.addEventListener('click', () => {
      const result = editor.getComposition();
      console.log('[CompositionEditor] Saved:', JSON.stringify(result, null, 2));
      alert(`Saved: ${result.compositionName} (theme: ${result.theme})`);
    });
    container.appendChild(saveBtn);

    return container;
  },
  /**
   * The Scoreboard and Watch presets, loaded from "Load preset" as a user would, against the preview's live and
   * finished matchUps. Australian, shown first, has none of their options: each is off by default.
   */
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const loadPreset = (name: string) => {
      const select = [...canvasElement.querySelectorAll('select')].find(
        (el) => el.options[0]?.textContent === '— Load preset —'
      ) as HTMLSelectElement;
      select.value = name;
      select.dispatchEvent(new Event('change'));
    };
    const preview = () => canvasElement.querySelector('.ce-preview-body') as HTMLElement;
    const live = () => preview().querySelector('[id="preview-in-progress"]') as HTMLElement;
    // the first card is the finished matchUp the preview gives a venue, event and video
    const done = () => preview().querySelector('.tmx-m') as HTMLElement;
    const sideOf = (card: HTMLElement, sideNumber: number) =>
      card.querySelector<HTMLElement>(`.tmx-sd[sidenumber="${sideNumber}"]`)!;
    const rgb = (hex: string) => {
      const n = Number.parseInt(hex.slice(1), 16);
      return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
    };
    const colorOf = (el: Element | null) => getComputedStyle(el as Element).color;
    const TRANSPARENT = 'rgba(0, 0, 0, 0)';
    const SERVER = '.chc-server';
    const POINT_SCORE = '.chc-point-score';

    // Australian: none of the scoreboard options
    expect(live().querySelector(SERVER)).toBeNull();
    expect(live().querySelector('[data-side-color]')).toBeNull();
    expect(live().querySelector('.chc-matchup-actions')).toBeNull();

    // ── Scoreboard ──
    loadPreset('Scoreboard');
    const sideColors = compositions.Scoreboard.configuration?.sideColors as Record<1 | 2, string>;
    const header = live().querySelector('.chc-scheduling') as HTMLElement;
    expect(header.querySelector('.chc-scheduling__left .chc-scheduling__elapsed')?.textContent).toBe('0:16');
    expect(header.querySelector('.chc-scheduling__left .chc-scheduling__location')?.textContent).toBe('RMTA Court 2');
    expect(header.querySelectorAll('.chc-scheduling__left .chc-online-resource').length).toBe(2);
    expect(header.querySelector('.chc-scheduling__event-round')?.textContent).toBe("Men's Singles - R32");
    expect(done().querySelector('.chc-scheduling__elapsed')?.textContent).toBe('1:07');
    expect(live().querySelector('.chc-matchup-footer')).toBeNull(); // matchUpFooter: false is honoured
    expect(live().querySelector('.chc-pill')).toBeNull(); // liveStatusPill: false

    // the serve column on both sides, filled for the server; the server's name in its colour
    expect(live().querySelectorAll(SERVER).length).toBe(2);
    expect(sideOf(live(), 2).querySelector('.chc-server--active')).not.toBeNull();
    expect(colorOf(sideOf(live(), 2).querySelector('.chc-participant-name'))).toBe(rgb(sideColors[2]));
    expect(done().querySelectorAll(SERVER).length).toBe(0); // a finished matchUp has no server

    // each point score boxed in its side's colour
    const point1 = sideOf(live(), 1).querySelector(POINT_SCORE) as Element;
    expect(getComputedStyle(point1).borderTopColor).toBe(rgb(sideColors[1]));
    expect(colorOf(sideOf(live(), 2).querySelector(POINT_SCORE))).toBe(rgb(sideColors[2]));

    // the winner: tinted row with nothing painting over it, name and tick in the winner's colour
    const winnerSide = done().querySelector<HTMLElement>('.tmx-sd[data-winner]') as HTMLElement;
    const winnerColor = rgb(sideColors[Number(winnerSide.getAttribute('sidenumber')) as 1 | 2]);
    const winnerRow = winnerSide.querySelector(':scope > .chc-side-row') as HTMLElement;
    expect(getComputedStyle(winnerRow).backgroundColor).not.toBe(TRANSPARENT);
    const covering = [...winnerRow.children].filter((el) => getComputedStyle(el).backgroundColor !== TRANSPARENT);
    expect(covering.map((el) => el.className)).toEqual([]);
    expect(colorOf(winnerSide.querySelector('.chc-participant-name'))).toBe(winnerColor);
    expect(getComputedStyle(winnerSide.querySelector('.chc-tick') as Element).backgroundColor).toBe(winnerColor);

    // every card fits what holds it, border included
    for (const card of preview().querySelectorAll<HTMLElement>('.ce-preview-matchup .chc-matchup')) {
      const limit = (card.parentElement as HTMLElement).getBoundingClientRect().right + 0.5;
      expect(card.getBoundingClientRect().right).toBeLessThanOrEqual(limit);
    }

    // the editor's Side 1 / Side 2 colour fields drive configuration.sideColors; both blank turns it off
    const sideField = (label: string) => {
      const row = [...canvasElement.querySelectorAll('.ce-field')].find(
        (el) => el.querySelector('span')?.textContent === label
      ) as HTMLElement;
      return row.querySelector('input[type="text"]') as HTMLInputElement;
    };
    const typeInto = (input: HTMLInputElement, value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    // open Colors, as a user would: a section refreshes its fields while it is open
    const colorsHeader = [...canvasElement.querySelectorAll<HTMLElement>('.ce-section-header')].find((el) =>
      el.textContent?.includes('Colors')
    ) as HTMLElement;
    colorsHeader.click();
    expect(sideField('Side 1').value).toBe(sideColors[1]);
    typeInto(sideField('Side 1'), '');
    typeInto(sideField('Side 2'), '');
    expect(live().querySelector('[data-side-color]')).toBeNull();
    typeInto(sideField('Side 1'), '#123456');
    expect(sideOf(live(), 1).dataset.sideColor).toBe('true');
    expect(sideOf(live(), 2).dataset.sideColor).toBeUndefined();

    // ── Watch ──
    loadPreset('Watch');
    const meta = live().querySelector('.chc-scheduling--inline .chc-scheduling__meta') as HTMLElement;
    const parts = [...meta.children].filter((el) => !el.classList.contains('chc-scheduling__dot'));
    expect(parts.map((el) => el.textContent)).toEqual(['Live', '0:16', 'RMTA Court 2', "Men's Singles", 'R32']);
    expect(meta.querySelectorAll('.chc-scheduling__dot').length).toBe(4);
    expect(done().querySelector('.chc-scheduling__live')).toBeNull(); // Live only while in progress

    // the server marked after the name, no column
    expect(sideOf(live(), 2).querySelector('.chc-participant-name .chc-server--name')).not.toBeNull();
    expect(sideOf(live(), 1).querySelector(SERVER)).toBeNull();
    // the point score plain, not inverted
    expect(live().querySelector(POINT_SCORE)).not.toBeNull();
    expect(live().querySelector('.chc-point-score--inverted')).toBeNull();
    // Watch (a stream or video) and Share (the preview gives a share handler)
    expect(live().querySelector('.chc-matchup-action--watch')?.textContent).toBe('Watch');
    expect(live().querySelector('.chc-matchup-action--share')).not.toBeNull();
    expect(done().querySelector('.chc-matchup-action--watch')).not.toBeNull(); // a finished matchUp's video
    expect(preview().querySelector('[id="preview-bye"] .chc-matchup-actions')).toBeNull(); // nothing to watch or share
  }
};

/**
 * National — complex composition with scale attributes
 */
export const NationalPreset = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '1em';
    // no fixed height: the editor grows as sections open, so new content is visible without scrolling a panel
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    const title = document.createElement('h2');
    title.textContent = 'National Composition';
    title.style.marginBottom = '0.5em';
    container.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent =
      'Demonstrates the most complex built-in composition with scale attributes, draw positions, and address display.';
    desc.style.marginBottom = '1em';
    desc.style.color = DESC_COLOR;
    container.appendChild(desc);

    const editorContainer = document.createElement('div');
    editorContainer.style.flex = '1';
    editorContainer.style.minHeight = '0';
    container.appendChild(editorContainer);

    createCompositionEditor(editorContainer, {
      composition: compositions.National,
      compositionName: 'National'
    });

    return container;
  }
};

/**
 * Read Only — view-only mode
 */
export const ReadOnly = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '1em';
    // no fixed height: the editor grows as sections open, so new content is visible without scrolling a panel
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    const title = document.createElement('h2');
    title.textContent = 'Read-Only Mode';
    title.style.marginBottom = '0.5em';
    container.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = 'All controls are disabled. Useful for viewing published compositions.';
    desc.style.marginBottom = '1em';
    desc.style.color = DESC_COLOR;
    container.appendChild(desc);

    const editorContainer = document.createElement('div');
    editorContainer.style.flex = '1';
    editorContainer.style.minHeight = '0';
    container.appendChild(editorContainer);

    createCompositionEditor(editorContainer, {
      composition: compositions.ITF,
      compositionName: 'ITF',
      readOnly: true
    });

    return container;
  }
};

/**
 * Empty — start from scratch
 */
export const EmptyStart = {
  render: () => {
    const container = document.createElement('div');
    container.style.padding = '1em';
    // no fixed height: the editor grows as sections open, so new content is visible without scrolling a panel
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    const title = document.createElement('h2');
    title.textContent = 'Start From Scratch';
    title.style.marginBottom = '0.5em';
    container.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent =
      'No initial composition — use the Theme & Preset section to load a starting point, or configure from empty.';
    desc.style.marginBottom = '1em';
    desc.style.color = DESC_COLOR;
    container.appendChild(desc);

    const editorContainer = document.createElement('div');
    editorContainer.style.flex = '1';
    editorContainer.style.minHeight = '0';
    container.appendChild(editorContainer);

    const editor = createCompositionEditor(editorContainer, {
      compositionName: 'My Custom',
      onChange: (comp) => {
        console.log('[CompositionEditor] onChange:', comp);
      }
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'button is-success';
    saveBtn.textContent = 'Export JSON (console)';
    saveBtn.style.marginTop = '0.5em';
    saveBtn.addEventListener('click', () => {
      const result = editor.getComposition();
      console.log(JSON.stringify(result, null, 2));
    });
    container.appendChild(saveBtn);

    return container;
  }
};
