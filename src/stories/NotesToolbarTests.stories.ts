/**
 * Notes toolbar — its buttons, select and popovers, in Chromium, through trusted input.
 *
 * The recent-colours list rules (newest first, no repeats, at most eight, bad storage read as none) are
 * unit-tested in node by `components/notes-toolbar/__tests__/recentColors.test.ts`. These plays pin the rest:
 * that every control reaches its handler, that the active state paints, that the colour and URL popovers open,
 * take input and close, and that picked colours persist in real localStorage.
 *
 * Run as tests: `pnpm exec vitest run --project storybook src/stories/NotesToolbarTests.stories.ts`
 */
import { notesToolbar, updateHeadingSelect, updateToolbarState } from '../components/notes-toolbar/notesToolbar';
import { RECENT_COLORS_KEY } from '../components/notes-toolbar/recentColors';
import { expect, fn, waitFor } from 'storybook/test';
import { user } from './helpers/trustedUser';
// the package entry imports tippy's stylesheet; its transition is what ends a popover's show
import '../styles/tippy.css';

// constants and types
import type { NotesToolbarOptions } from '../components/notes-toolbar/notesToolbar';
import type { Meta, StoryObj } from '@storybook/html-vite';

const meta: Meta = {
  title: 'Foundations/Notes Editor/Tests/Toolbar',
  tags: ['!dev']
};
export default meta;

const ACTIONS = [
  'heading',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'orderedList',
  'bulletList',
  'alignLeft',
  'alignCenter',
  'alignRight',
  'alignJustify',
  'blockquote',
  'codeBlock',
  'link',
  'video',
  'clearFormatting'
];
const SIMPLE_HANDLERS = {
  bold: 'onBold',
  italic: 'onItalic',
  underline: 'onUnderline',
  strike: 'onStrike',
  orderedList: 'onOrderedList',
  bulletList: 'onBulletList',
  blockquote: 'onBlockquote',
  codeBlock: 'onCodeBlock',
  clearFormatting: 'onClearFormatting'
} as const;
const ALIGNMENTS = { alignLeft: 'left', alignCenter: 'center', alignRight: 'right', alignJustify: 'justify' };

const handlers = {
  onBold: fn(),
  onItalic: fn(),
  onUnderline: fn(),
  onStrike: fn(),
  onHeading: fn(),
  onColor: fn(),
  onBackground: fn(),
  onBulletList: fn(),
  onOrderedList: fn(),
  onAlign: fn(),
  onBlockquote: fn(),
  onCodeBlock: fn(),
  onLink: fn(),
  onVideo: fn(),
  onClearFormatting: fn()
} satisfies Required<NotesToolbarOptions>;

const COLOR_PANEL = '.notes-color-panel';
const URL_PANEL = '.notes-url-panel';
const SECTION_LABEL = '.notes-color-section-label';

function forgetRecentColors(): void {
  try {
    localStorage.removeItem(RECENT_COLORS_KEY);
  } catch {
    // storage blocked: the story then starts with no history anyway
  }
}

function toolbarHost(): HTMLElement {
  for (const handler of Object.values(handlers)) handler.mockClear();
  forgetRecentColors();
  const host = document.createElement('div');
  host.style.padding = '1em';
  host.style.minHeight = '320px';
  host.appendChild(notesToolbar(handlers));
  return host;
}

const control = (canvas: HTMLElement, action: string) =>
  canvas.querySelector<HTMLElement>(`[data-action="${action}"]`)!;
const storedRecent = () => JSON.parse(localStorage.getItem(RECENT_COLORS_KEY) || 'null');

/** `selector` in the page (tippy mounts its popover outside the toolbar), once it shows. */
async function shown(selector: string): Promise<HTMLElement> {
  let found: HTMLElement | null = null;
  await waitFor(() => {
    found = document.querySelector<HTMLElement>(selector);
    expect(found).not.toBeNull();
    expect(found).toBeVisible();
    expect(found!.checkVisibility()).toBe(true);
  });
  return found!;
}
const gone = (selector: string) => waitFor(() => expect(document.querySelector(selector)).toBeNull());

export const EveryControlIsLabelled: StoryObj = {
  render: toolbarHost,
  play: async ({ canvasElement }) => {
    const toolbar = canvasElement.querySelector('.notes-toolbar')!;
    const groups = toolbar.querySelectorAll('.notes-toolbar-group');
    await expect(groups).toHaveLength(7);
    for (const group of groups) await expect(group).toBeVisible();
    await expect([...toolbar.querySelectorAll<HTMLElement>('[data-action]')].map((el) => el.dataset.action)).toEqual(
      ACTIONS
    );
    const select = control(canvasElement, 'heading') as HTMLSelectElement;
    await expect([...select.options].map((option) => option.textContent)).toEqual([
      'Paragraph',
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Heading 4',
      'Heading 5',
      'Heading 6'
    ]);
    for (const button of toolbar.querySelectorAll<HTMLButtonElement>('.notes-toolbar-btn')) {
      await expect(button.title.length).toBeGreaterThan(0);
      await expect(button.type).toBe('button');
      await expect(button).toBeVisible();
    }
    for (const action of ['orderedList', 'bulletList', ...Object.keys(ALIGNMENTS)]) {
      // the toolbar stylesheet sizes every icon to 14px, whatever the SVG says
      const icon = control(canvasElement, action).querySelector('svg')!.getBoundingClientRect();
      await expect([icon.width, icon.height]).toEqual([14, 14]);
    }
  }
};

export const ButtonsReachTheirHandlers: StoryObj = {
  render: toolbarHost,
  play: async ({ canvasElement }) => {
    for (const [action, handler] of Object.entries(SIMPLE_HANDLERS)) {
      await user.click(control(canvasElement, action));
      await expect(handlers[handler]).toHaveBeenCalledOnce();
    }
    for (const [action, direction] of Object.entries(ALIGNMENTS)) {
      await user.click(control(canvasElement, action));
      await expect(handlers.onAlign).toHaveBeenLastCalledWith(direction);
    }
    await expect(handlers.onAlign).toHaveBeenCalledTimes(4);
    // one click, one handler: no button reached another's
    const calls = Object.values(handlers).reduce((sum, handler) => sum + handler.mock.calls.length, 0);
    await expect(calls).toBe(Object.keys(SIMPLE_HANDLERS).length + 4);
  }
};

export const HeadingSelectAndState: StoryObj = {
  render: toolbarHost,
  play: async ({ canvasElement }) => {
    const toolbar = canvasElement.querySelector<HTMLElement>('.notes-toolbar')!;
    const select = control(canvasElement, 'heading') as HTMLSelectElement;
    await user.selectOptions(select, '2');
    await expect(handlers.onHeading).toHaveBeenLastCalledWith(2);
    await user.selectOptions(select, '0');
    await expect(handlers.onHeading).toHaveBeenLastCalledWith(false);

    updateHeadingSelect(toolbar, 3);
    await expect(select.value).toBe('3');
    await expect(select.selectedOptions[0].textContent).toBe('Heading 3');
    updateHeadingSelect(toolbar, false);
    await expect(select.value).toBe('0');

    const bold = control(canvasElement, 'bold');
    const italic = control(canvasElement, 'italic');
    const idle = getComputedStyle(italic).backgroundColor;
    updateToolbarState(toolbar, { bold: true, italic: false, nonexistent: true });
    await expect(bold.classList.contains('is-active')).toBe(true);
    // the active state paints: the active background and weight, not only a class
    await expect(getComputedStyle(bold).backgroundColor).not.toBe(idle);
    await expect(getComputedStyle(bold).fontWeight).toBe('600');
    await expect(italic.classList.contains('is-active')).toBe(false);
    updateToolbarState(toolbar, { bold: false, italic: true });
    await expect(getComputedStyle(bold).backgroundColor).toBe(idle);
    await expect(getComputedStyle(italic).fontWeight).toBe('600');
  }
};

export const ColorPaletteAppliesAndRemembers: StoryObj = {
  render: toolbarHost,
  play: async ({ canvasElement }) => {
    const colorButton = control(canvasElement, 'color');
    const bar = colorButton.querySelector('.notes-toolbar-color-bar')!;
    await expect(getComputedStyle(bar).backgroundColor).toBe('rgb(0, 0, 0)');

    await user.click(colorButton);
    let panel = await shown(COLOR_PANEL);
    await expect(panel.querySelectorAll('.notes-color-swatch')).toHaveLength(28);
    await expect(panel.querySelector(SECTION_LABEL)).toBeNull(); // no history yet
    await user.click(panel.querySelector<HTMLElement>('.notes-color-swatch[title="#ff0000"]')!);
    await expect(handlers.onColor).toHaveBeenCalledOnce();
    await expect(handlers.onColor).toHaveBeenCalledWith('#ff0000');
    await gone(COLOR_PANEL);
    await expect(getComputedStyle(bar).backgroundColor).toBe('rgb(255, 0, 0)');
    await expect(storedRecent()).toEqual(['#ff0000']);

    // the button toggles its panel
    await user.click(colorButton);
    await shown(COLOR_PANEL);
    await user.click(colorButton);
    await gone(COLOR_PANEL);

    await user.click(control(canvasElement, 'background'));
    panel = await shown(COLOR_PANEL);
    await expect(panel.querySelector(SECTION_LABEL)?.textContent).toBe('Recent');
    const recent = panel.querySelectorAll<HTMLElement>('.notes-color-swatches')[1];
    await expect([...recent.children].map((swatch) => (swatch as HTMLElement).title)).toEqual(['#ff0000']);
    await user.click(panel.querySelector<HTMLElement>('.notes-color-swatch[title="#4a86e8"]')!);
    await expect(handlers.onBackground).toHaveBeenCalledOnce();
    await expect(handlers.onBackground).toHaveBeenCalledWith('#4a86e8');
    await expect(handlers.onColor).toHaveBeenCalledOnce();
    await gone(COLOR_PANEL);
    await expect(storedRecent()).toEqual(['#4a86e8', '#ff0000']);
  }
};

export const CorruptHistoryDoesNotBlockAColour: StoryObj = {
  render: () => {
    const host = toolbarHost();
    localStorage.setItem(RECENT_COLORS_KEY, '{"0":"#ff0000"}');
    return host;
  },
  play: async ({ canvasElement }) => {
    await user.click(control(canvasElement, 'color'));
    const panel = await shown(COLOR_PANEL);
    await expect(panel.querySelector(SECTION_LABEL)).toBeNull();
    await user.click(panel.querySelector<HTMLElement>('.notes-color-swatch[title="#0000ff"]')!);
    await expect(handlers.onColor).toHaveBeenCalledOnce();
    await expect(handlers.onColor).toHaveBeenCalledWith('#0000ff');
    await expect(storedRecent()).toEqual(['#0000ff']);
    await gone(COLOR_PANEL);
  }
};

export const UrlPopoverInsertsAndCancels: StoryObj = {
  render: toolbarHost,
  play: async ({ canvasElement }) => {
    await user.click(control(canvasElement, 'link'));
    let panel = await shown(URL_PANEL);
    const input = panel.querySelector<HTMLInputElement>('.notes-url-input')!;
    await expect(input.type).toBe('url');
    await expect(panel.querySelector('.notes-url-label')?.textContent).toBe('Enter URL');
    await waitFor(() => expect(document.activeElement).toBe(input)); // ready to type into
    await user.type(input, '  https://courthive.com  ');
    await user.keyboard('{Enter}');
    await expect(handlers.onLink).toHaveBeenCalledOnce();
    await expect(handlers.onLink).toHaveBeenCalledWith('https://courthive.com');
    await gone(URL_PANEL);

    // an empty URL inserts nothing, and still closes
    await user.click(control(canvasElement, 'video'));
    panel = await shown(URL_PANEL);
    await expect(panel.querySelector('.notes-url-label')?.textContent).toBe('YouTube URL');
    await user.click(panel.querySelector<HTMLElement>('.notes-url-confirm')!);
    await gone(URL_PANEL);
    await expect(handlers.onVideo).not.toHaveBeenCalled();

    // Escape and Cancel both leave without inserting
    await user.click(control(canvasElement, 'video'));
    panel = await shown(URL_PANEL);
    const videoInput = panel.querySelector<HTMLInputElement>('.notes-url-input')!;
    await waitFor(() => expect(document.activeElement).toBe(videoInput));
    await user.type(videoInput, 'https://youtube.com/watch?v=1');
    await user.keyboard('{Escape}');
    await gone(URL_PANEL);
    await user.click(control(canvasElement, 'link'));
    panel = await shown(URL_PANEL);
    await user.click(panel.querySelector<HTMLElement>('.notes-url-cancel')!);
    await gone(URL_PANEL);
    await expect(handlers.onVideo).not.toHaveBeenCalled();
    await expect(handlers.onLink).toHaveBeenCalledOnce();
  }
};
