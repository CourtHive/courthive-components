/**
 * @vitest-environment happy-dom
 */
import { notesToolbar, updateToolbarState, updateHeadingSelect } from '../notesToolbar';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NotesToolbarOptions } from '../notesToolbar';

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
    const select = el.querySelector('select[data-action="heading"]') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(7);
    expect(select.options[0].textContent).toBe('Paragraph');
    expect(select.options[1].textContent).toBe('Heading 1');
  });

  it('renders text formatting buttons', () => {
    const el = notesToolbar();
    expect(el.querySelector('[data-action="bold"]')).toBeTruthy();
    expect(el.querySelector('[data-action="italic"]')).toBeTruthy();
    expect(el.querySelector('[data-action="underline"]')).toBeTruthy();
    expect(el.querySelector('[data-action="strike"]')).toBeTruthy();
  });

  it('renders alignment buttons with SVG icons', () => {
    const el = notesToolbar();
    for (const action of ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify']) {
      const btn = el.querySelector(`[data-action="${action}"]`);
      expect(btn).toBeTruthy();
      expect(btn?.querySelector('svg')).toBeTruthy();
    }
  });

  it('renders list buttons with SVG icons', () => {
    const el = notesToolbar();
    for (const action of ['orderedList', 'bulletList']) {
      const btn = el.querySelector(`[data-action="${action}"]`);
      expect(btn).toBeTruthy();
      expect(btn?.querySelector('svg')).toBeTruthy();
    }
  });

  it('renders color buttons', () => {
    const el = notesToolbar();
    expect(el.querySelector('[data-action="color"]')).toBeTruthy();
    expect(el.querySelector('[data-action="background"]')).toBeTruthy();
  });

  it('renders block element buttons', () => {
    const el = notesToolbar();
    expect(el.querySelector('[data-action="blockquote"]')).toBeTruthy();
    expect(el.querySelector('[data-action="codeBlock"]')).toBeTruthy();
    expect(el.querySelector('[data-action="link"]')).toBeTruthy();
    expect(el.querySelector('[data-action="video"]')).toBeTruthy();
  });

  it('renders clear formatting button', () => {
    const el = notesToolbar();
    expect(el.querySelector('[data-action="clearFormatting"]')).toBeTruthy();
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
    (el.querySelector('[data-action="bold"]') as HTMLElement).click();
    expect(onBold).toHaveBeenCalledOnce();
  });

  it('calls onItalic when italic button clicked', () => {
    const onItalic = vi.fn();
    const el = notesToolbar({ onItalic });
    (el.querySelector('[data-action="italic"]') as HTMLElement).click();
    expect(onItalic).toHaveBeenCalledOnce();
  });

  it('calls onUnderline when underline button clicked', () => {
    const onUnderline = vi.fn();
    const el = notesToolbar({ onUnderline });
    (el.querySelector('[data-action="underline"]') as HTMLElement).click();
    expect(onUnderline).toHaveBeenCalledOnce();
  });

  it('calls onStrike when strike button clicked', () => {
    const onStrike = vi.fn();
    const el = notesToolbar({ onStrike });
    (el.querySelector('[data-action="strike"]') as HTMLElement).click();
    expect(onStrike).toHaveBeenCalledOnce();
  });

  it('calls onBlockquote when blockquote button clicked', () => {
    const onBlockquote = vi.fn();
    const el = notesToolbar({ onBlockquote });
    (el.querySelector('[data-action="blockquote"]') as HTMLElement).click();
    expect(onBlockquote).toHaveBeenCalledOnce();
  });

  it('calls onCodeBlock when code block button clicked', () => {
    const onCodeBlock = vi.fn();
    const el = notesToolbar({ onCodeBlock });
    (el.querySelector('[data-action="codeBlock"]') as HTMLElement).click();
    expect(onCodeBlock).toHaveBeenCalledOnce();
  });

  it('calls onClearFormatting when clear button clicked', () => {
    const onClearFormatting = vi.fn();
    const el = notesToolbar({ onClearFormatting });
    (el.querySelector('[data-action="clearFormatting"]') as HTMLElement).click();
    expect(onClearFormatting).toHaveBeenCalledOnce();
  });

  it('calls onBulletList when bullet list button clicked', () => {
    const onBulletList = vi.fn();
    const el = notesToolbar({ onBulletList });
    (el.querySelector('[data-action="bulletList"]') as HTMLElement).click();
    expect(onBulletList).toHaveBeenCalledOnce();
  });

  it('calls onOrderedList when ordered list button clicked', () => {
    const onOrderedList = vi.fn();
    const el = notesToolbar({ onOrderedList });
    (el.querySelector('[data-action="orderedList"]') as HTMLElement).click();
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
    const select = el.querySelector('[data-action="heading"]') as HTMLSelectElement;

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
    const boldBtn = el.querySelector('[data-action="bold"]') as HTMLElement;
    const italicBtn = el.querySelector('[data-action="italic"]') as HTMLElement;

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
    const select = el.querySelector('[data-action="heading"]') as HTMLSelectElement;

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

    const colorBtn = el.querySelector('[data-action="color"]') as HTMLElement;
    colorBtn.click();

    // tippy appends to document.body
    const panel = document.querySelector('.notes-color-panel');
    expect(panel).toBeTruthy();

    const swatches = panel?.querySelectorAll('.notes-color-swatch');
    expect(swatches?.length).toBeGreaterThanOrEqual(28);

    document.body.removeChild(el);
  });

  it('opens color panel on background button click', () => {
    const el = notesToolbar();
    document.body.appendChild(el);

    const bgBtn = el.querySelector('[data-action="background"]') as HTMLElement;
    bgBtn.click();

    const panel = document.querySelector('.notes-color-panel');
    expect(panel).toBeTruthy();

    document.body.removeChild(el);
  });
});

describe('link/video popovers', () => {
  it('opens URL popover on link button click', () => {
    const el = notesToolbar();
    document.body.appendChild(el);

    const linkBtn = el.querySelector('[data-action="link"]') as HTMLElement;
    linkBtn.click();

    const panel = document.querySelector('.notes-url-panel');
    expect(panel).toBeTruthy();

    const input = panel?.querySelector('.notes-url-input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe('url');

    const confirmBtn = panel?.querySelector('.notes-url-confirm');
    expect(confirmBtn).toBeTruthy();

    const cancelBtn = panel?.querySelector('.notes-url-cancel');
    expect(cancelBtn).toBeTruthy();

    document.body.removeChild(el);
  });

  it('opens URL popover on video button click', () => {
    const el = notesToolbar();
    document.body.appendChild(el);

    const videoBtn = el.querySelector('[data-action="video"]') as HTMLElement;
    videoBtn.click();

    const panel = document.querySelector('.notes-url-panel');
    expect(panel).toBeTruthy();

    document.body.removeChild(el);
  });

  it('calls onLink with URL when confirmed', () => {
    const onLink = vi.fn();
    const el = notesToolbar({ onLink });
    document.body.appendChild(el);

    const linkBtn = el.querySelector('[data-action="link"]') as HTMLElement;
    linkBtn.click();

    const panel = document.querySelector('.notes-url-panel');
    const input = panel?.querySelector('.notes-url-input') as HTMLInputElement;
    const confirmBtn = panel?.querySelector('.notes-url-confirm') as HTMLElement;

    input.value = 'https://example.com';
    confirmBtn.click();

    expect(onLink).toHaveBeenCalledWith('https://example.com');

    document.body.removeChild(el);
  });

  it('does not call onVideo with empty URL', () => {
    const onVideo = vi.fn();
    const el = notesToolbar({ onVideo });
    document.body.appendChild(el);

    const videoBtn = el.querySelector('[data-action="video"]') as HTMLElement;
    videoBtn.click();

    const panel = document.querySelector('.notes-url-panel');
    const confirmBtn = panel?.querySelector('.notes-url-confirm') as HTMLElement;
    confirmBtn.click();

    expect(onVideo).not.toHaveBeenCalled();

    document.body.removeChild(el);
  });
});
