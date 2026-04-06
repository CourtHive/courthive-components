/**
 * @vitest-environment happy-dom
 */
import { notesToolbar, updateToolbarState, updateHeadingSelect } from '../notesToolbar';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sel = (action: string) => `[data-action="${action}"]`;
const URL_PANEL = '.notes-url-panel';
const URL_INPUT = '.notes-url-input';
const URL_CONFIRM = '.notes-url-confirm';
const URL_CANCEL = '.notes-url-cancel';
const COLOR_PANEL = '.notes-color-panel';
const COLOR_SWATCH = '.notes-color-swatch';

describe('notesToolbar', () => {
  it('returns an element with notes-toolbar class', () => {
    const el = notesToolbar();
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.className).toBe('notes-toolbar');
  });

  it('renders all 7 toolbar groups', () => {
    const el = notesToolbar();
    const groups = el.querySelectorAll('.notes-toolbar-group');
    expect(groups.length).toBe(7);
  });

  it('renders heading select with 7 options', () => {
    const el = notesToolbar();
    const select = el.querySelector(sel('heading')) as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(7);
    expect(select.options[0].textContent).toBe('Paragraph');
    expect(select.options[1].textContent).toBe('Heading 1');
  });

  it('renders text formatting buttons', () => {
    const el = notesToolbar();
    expect(el.querySelector(sel('bold'))).toBeTruthy();
    expect(el.querySelector(sel('italic'))).toBeTruthy();
    expect(el.querySelector(sel('underline'))).toBeTruthy();
    expect(el.querySelector(sel('strike'))).toBeTruthy();
  });

  it('renders alignment buttons with SVG icons', () => {
    const el = notesToolbar();
    for (const action of ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify']) {
      const btn = el.querySelector(sel(action));
      expect(btn).toBeTruthy();
      expect(btn?.querySelector('svg')).toBeTruthy();
    }
  });

  it('renders list buttons with SVG icons', () => {
    const el = notesToolbar();
    for (const action of ['orderedList', 'bulletList']) {
      const btn = el.querySelector(sel(action));
      expect(btn).toBeTruthy();
      expect(btn?.querySelector('svg')).toBeTruthy();
    }
  });

  it('renders color buttons', () => {
    const el = notesToolbar();
    expect(el.querySelector(sel('color'))).toBeTruthy();
    expect(el.querySelector(sel('background'))).toBeTruthy();
  });

  it('renders block element buttons', () => {
    const el = notesToolbar();
    expect(el.querySelector(sel('blockquote'))).toBeTruthy();
    expect(el.querySelector(sel('codeBlock'))).toBeTruthy();
    expect(el.querySelector(sel('link'))).toBeTruthy();
    expect(el.querySelector(sel('video'))).toBeTruthy();
  });

  it('renders clear formatting button', () => {
    const el = notesToolbar();
    expect(el.querySelector(sel('clearFormatting'))).toBeTruthy();
  });

  it('all buttons have title attributes', () => {
    const el = notesToolbar();
    const buttons = el.querySelectorAll('.notes-toolbar-btn');
    for (const btn of buttons) {
      expect(btn.getAttribute('title')).toBeTruthy();
    }
  });
});

describe('toolbar callbacks', () => {
  it('calls onBold when bold button clicked', () => {
    const onBold = vi.fn();
    const el = notesToolbar({ onBold });
    (el.querySelector(sel('bold')) as HTMLElement).click();
    expect(onBold).toHaveBeenCalledOnce();
  });

  it('calls onItalic when italic button clicked', () => {
    const onItalic = vi.fn();
    const el = notesToolbar({ onItalic });
    (el.querySelector(sel('italic')) as HTMLElement).click();
    expect(onItalic).toHaveBeenCalledOnce();
  });

  it('calls onUnderline when underline button clicked', () => {
    const onUnderline = vi.fn();
    const el = notesToolbar({ onUnderline });
    (el.querySelector(sel('underline')) as HTMLElement).click();
    expect(onUnderline).toHaveBeenCalledOnce();
  });

  it('calls onStrike when strike button clicked', () => {
    const onStrike = vi.fn();
    const el = notesToolbar({ onStrike });
    (el.querySelector(sel('strike')) as HTMLElement).click();
    expect(onStrike).toHaveBeenCalledOnce();
  });

  it('calls onBlockquote when blockquote button clicked', () => {
    const onBlockquote = vi.fn();
    const el = notesToolbar({ onBlockquote });
    (el.querySelector(sel('blockquote')) as HTMLElement).click();
    expect(onBlockquote).toHaveBeenCalledOnce();
  });

  it('calls onCodeBlock when code block button clicked', () => {
    const onCodeBlock = vi.fn();
    const el = notesToolbar({ onCodeBlock });
    (el.querySelector(sel('codeBlock')) as HTMLElement).click();
    expect(onCodeBlock).toHaveBeenCalledOnce();
  });

  it('calls onClearFormatting when clear button clicked', () => {
    const onClearFormatting = vi.fn();
    const el = notesToolbar({ onClearFormatting });
    (el.querySelector(sel('clearFormatting')) as HTMLElement).click();
    expect(onClearFormatting).toHaveBeenCalledOnce();
  });

  it('calls onBulletList when bullet list button clicked', () => {
    const onBulletList = vi.fn();
    const el = notesToolbar({ onBulletList });
    (el.querySelector(sel('bulletList')) as HTMLElement).click();
    expect(onBulletList).toHaveBeenCalledOnce();
  });

  it('calls onOrderedList when ordered list button clicked', () => {
    const onOrderedList = vi.fn();
    const el = notesToolbar({ onOrderedList });
    (el.querySelector(sel('orderedList')) as HTMLElement).click();
    expect(onOrderedList).toHaveBeenCalledOnce();
  });

  it('calls onAlign with direction when alignment buttons clicked', () => {
    const onAlign = vi.fn();
    const el = notesToolbar({ onAlign });

    (el.querySelector('[data-action="alignLeft"]') as HTMLElement).click();
    expect(onAlign).toHaveBeenLastCalledWith('left');

    (el.querySelector('[data-action="alignCenter"]') as HTMLElement).click();
    expect(onAlign).toHaveBeenLastCalledWith('center');

    (el.querySelector('[data-action="alignRight"]') as HTMLElement).click();
    expect(onAlign).toHaveBeenLastCalledWith('right');

    (el.querySelector('[data-action="alignJustify"]') as HTMLElement).click();
    expect(onAlign).toHaveBeenLastCalledWith('justify');

    expect(onAlign).toHaveBeenCalledTimes(4);
  });

  it('calls onHeading with level when heading select changes', () => {
    const onHeading = vi.fn();
    const el = notesToolbar({ onHeading });
    const select = el.querySelector(sel('heading')) as HTMLSelectElement;

    select.value = '2';
    select.dispatchEvent(new Event('change'));
    expect(onHeading).toHaveBeenLastCalledWith(2);

    select.value = '0';
    select.dispatchEvent(new Event('change'));
    expect(onHeading).toHaveBeenLastCalledWith(false);
  });
});

describe('updateToolbarState', () => {
  it('toggles is-active class on buttons by data-action', () => {
    const el = notesToolbar();
    const boldBtn = el.querySelector(sel('bold')) as HTMLElement;
    const italicBtn = el.querySelector(sel('italic')) as HTMLElement;

    updateToolbarState(el, { bold: true, italic: false });
    expect(boldBtn.classList.contains('is-active')).toBe(true);
    expect(italicBtn.classList.contains('is-active')).toBe(false);

    updateToolbarState(el, { bold: false, italic: true });
    expect(boldBtn.classList.contains('is-active')).toBe(false);
    expect(italicBtn.classList.contains('is-active')).toBe(true);
  });

  it('handles unknown actions gracefully', () => {
    const el = notesToolbar();
    expect(() => updateToolbarState(el, { nonexistent: true })).not.toThrow();
  });
});

describe('updateHeadingSelect', () => {
  it('sets select value to heading level', () => {
    const el = notesToolbar();
    const select = el.querySelector(sel('heading')) as HTMLSelectElement;

    updateHeadingSelect(el, 3);
    expect(select.value).toBe('3');

    updateHeadingSelect(el, false);
    expect(select.value).toBe('0');
  });
});

describe('color palette', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('opens color panel on color button click', () => {
    const el = notesToolbar();
    document.body.appendChild(el);

    (el.querySelector(sel('color')) as HTMLElement).click();

    const panel = document.querySelector(COLOR_PANEL);
    expect(panel).toBeTruthy();

    const swatches = panel?.querySelectorAll(COLOR_SWATCH);
    expect(swatches?.length).toBeGreaterThanOrEqual(28);

    document.body.removeChild(el);
  });

  it('opens color panel on background button click', () => {
    const el = notesToolbar();
    document.body.appendChild(el);

    (el.querySelector(sel('background')) as HTMLElement).click();

    const panel = document.querySelector(COLOR_PANEL);
    expect(panel).toBeTruthy();

    document.body.removeChild(el);
  });
});

describe('link/video popovers', () => {
  it('opens URL popover on link button click', () => {
    const el = notesToolbar();
    document.body.appendChild(el);

    (el.querySelector(sel('link')) as HTMLElement).click();

    const panel = document.querySelector(URL_PANEL);
    expect(panel).toBeTruthy();
    expect((panel?.querySelector(URL_INPUT) as HTMLInputElement).type).toBe('url');
    expect(panel?.querySelector(URL_CONFIRM)).toBeTruthy();
    expect(panel?.querySelector(URL_CANCEL)).toBeTruthy();

    document.body.removeChild(el);
  });

  it('opens URL popover on video button click', () => {
    const el = notesToolbar();
    document.body.appendChild(el);

    (el.querySelector(sel('video')) as HTMLElement).click();

    expect(document.querySelector(URL_PANEL)).toBeTruthy();

    document.body.removeChild(el);
  });

  it('calls onLink with URL when confirmed', () => {
    const onLink = vi.fn();
    const el = notesToolbar({ onLink });
    document.body.appendChild(el);

    (el.querySelector(sel('link')) as HTMLElement).click();

    const panel = document.querySelector(URL_PANEL);
    const input = panel?.querySelector(URL_INPUT) as HTMLInputElement;
    const confirmBtn = panel?.querySelector(URL_CONFIRM) as HTMLElement;

    input.value = 'https://example.com';
    confirmBtn.click();

    expect(onLink).toHaveBeenCalledWith('https://example.com');

    document.body.removeChild(el);
  });

  it('does not call onVideo with empty URL', () => {
    const onVideo = vi.fn();
    const el = notesToolbar({ onVideo });
    document.body.appendChild(el);

    (el.querySelector(sel('video')) as HTMLElement).click();

    const confirmBtn = document.querySelector(URL_PANEL)?.querySelector(URL_CONFIRM) as HTMLElement;
    confirmBtn.click();

    expect(onVideo).not.toHaveBeenCalled();

    document.body.removeChild(el);
  });
});
