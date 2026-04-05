import './notesToolbar.css';
import tippy, { Instance } from 'tippy.js';

export interface NotesToolbarOptions {
  onBold?: () => void;
  onItalic?: () => void;
  onUnderline?: () => void;
  onStrike?: () => void;
  onHeading?: (level: number | false) => void;
  onColor?: (color: string) => void;
  onBackground?: (color: string) => void;
  onBulletList?: () => void;
  onOrderedList?: () => void;
  onAlign?: (align: string) => void;
  onBlockquote?: () => void;
  onCodeBlock?: () => void;
  onLink?: (url: string) => void;
  onVideo?: (url: string) => void;
  onClearFormatting?: () => void;
}

const PALETTE_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff',
  '#9900ff', '#ff00ff', '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3',
  '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
];

const RECENT_COLORS_KEY = 'notes-toolbar-recent-colors';
const MAX_RECENT = 8;

function getRecentColors(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_COLORS_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecentColor(color: string): void {
  let recent = getRecentColors().filter((c) => c !== color);
  recent.unshift(color);
  if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(recent));
}

export function notesToolbar(options: NotesToolbarOptions = {}): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.className = 'notes-toolbar';

  toolbar.appendChild(createHeadingGroup(options));
  toolbar.appendChild(createTextFormattingGroup(options));
  toolbar.appendChild(createColorGroup(options));
  toolbar.appendChild(createListGroup(options));
  toolbar.appendChild(createAlignmentGroup(options));
  toolbar.appendChild(createBlockGroup(options));
  toolbar.appendChild(createClearGroup(options));

  return toolbar;
}

export function updateToolbarState(toolbar: HTMLElement, activeMap: Record<string, boolean>): void {
  for (const [action, active] of Object.entries(activeMap)) {
    const btn = toolbar.querySelector(`[data-action="${action}"]`) as HTMLElement;
    if (btn) btn.classList.toggle('is-active', active);
  }
}

export function updateHeadingSelect(toolbar: HTMLElement, level: number | false): void {
  const select = toolbar.querySelector('[data-action="heading"]') as HTMLSelectElement;
  if (select) select.value = level === false ? '0' : String(level);
}

function createGroup(): HTMLDivElement {
  const group = document.createElement('div');
  group.className = 'notes-toolbar-group';
  return group;
}

function createButton(action: string, label: string, title: string, onClick?: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'notes-toolbar-btn';
  btn.dataset.action = action;
  btn.title = title;
  btn.type = 'button';
  btn.innerHTML = label;
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}

function createHeadingGroup(options: NotesToolbarOptions): HTMLDivElement {
  const group = createGroup();
  const select = document.createElement('select');
  select.dataset.action = 'heading';
  select.title = 'Text style';

  const headingOptions = [
    { value: '0', label: 'Paragraph' },
    { value: '1', label: 'Heading 1' },
    { value: '2', label: 'Heading 2' },
    { value: '3', label: 'Heading 3' },
    { value: '4', label: 'Heading 4' },
    { value: '5', label: 'Heading 5' },
    { value: '6', label: 'Heading 6' },
  ];

  for (const opt of headingOptions) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  }

  select.addEventListener('change', () => {
    const val = parseInt(select.value, 10);
    options.onHeading?.(val === 0 ? false : val);
  });

  group.appendChild(select);
  return group;
}

function createTextFormattingGroup(options: NotesToolbarOptions): HTMLDivElement {
  const group = createGroup();
  group.appendChild(createButton('bold', '<b>B</b>', 'Bold', options.onBold));
  group.appendChild(createButton('italic', '<i>I</i>', 'Italic', options.onItalic));
  group.appendChild(createButton('underline', '<u>U</u>', 'Underline', options.onUnderline));
  group.appendChild(createButton('strike', '<s>S</s>', 'Strikethrough', options.onStrike));
  return group;
}

// -- Color palette with favorites + recent --

function createColorGroup(options: NotesToolbarOptions): HTMLDivElement {
  const group = createGroup();

  group.appendChild(
    createColorButton('color', 'A', 'Text color', '#000000', (color) => {
      addRecentColor(color);
      options.onColor?.(color);
    }),
  );
  group.appendChild(
    createColorButton('background', 'A', 'Background color', '#ffff00', (color) => {
      addRecentColor(color);
      options.onBackground?.(color);
    }),
  );

  return group;
}

function createColorButton(
  action: string,
  label: string,
  title: string,
  defaultColor: string,
  onChange: (color: string) => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'notes-toolbar-btn notes-toolbar-color-btn';
  btn.dataset.action = action;
  btn.title = title;
  btn.type = 'button';

  const text = document.createElement('span');
  text.className = 'notes-toolbar-color-letter';
  text.textContent = label;
  btn.appendChild(text);

  const bar = document.createElement('span');
  bar.className = 'notes-toolbar-color-bar';
  bar.style.backgroundColor = defaultColor;
  btn.appendChild(bar);

  let tip: Instance | undefined;

  btn.addEventListener('click', () => {
    if (tip) {
      tip.destroy();
      tip = undefined;
      return;
    }

    const panel = buildColorPanel(defaultColor, (color) => {
      bar.style.backgroundColor = color;
      onChange(color);
      tip?.destroy();
      tip = undefined;
    });

    tip = tippy(btn, {
      content: panel,
      theme: 'light-border',
      trigger: 'manual',
      interactive: true,
      placement: 'bottom-start',
      onHidden: () => {
        tip?.destroy();
        tip = undefined;
      },
    });
    tip.show();
  });

  return btn;
}

function buildColorPanel(currentColor: string, onSelect: (color: string) => void): HTMLDivElement {
  const panel = document.createElement('div');
  panel.className = 'notes-color-panel';

  const swatchSection = document.createElement('div');
  swatchSection.className = 'notes-color-swatches';
  for (const color of PALETTE_COLORS) {
    swatchSection.appendChild(createSwatch(color, color === currentColor, onSelect));
  }
  panel.appendChild(swatchSection);

  const recent = getRecentColors();
  if (recent.length) {
    const recentLabel = document.createElement('div');
    recentLabel.className = 'notes-color-section-label';
    recentLabel.textContent = 'Recent';
    panel.appendChild(recentLabel);

    const recentSection = document.createElement('div');
    recentSection.className = 'notes-color-swatches';
    for (const color of recent) {
      recentSection.appendChild(createSwatch(color, color === currentColor, onSelect));
    }
    panel.appendChild(recentSection);
  }

  const customRow = document.createElement('div');
  customRow.className = 'notes-color-custom-row';

  const customInput = document.createElement('input');
  customInput.type = 'color';
  customInput.value = currentColor;
  customInput.className = 'notes-color-custom-input';

  const customLabel = document.createElement('label');
  customLabel.className = 'notes-color-custom-label';
  customLabel.textContent = 'Custom...';
  customLabel.addEventListener('click', () => customInput.click());

  customInput.addEventListener('input', () => onSelect(customInput.value));

  customRow.appendChild(customInput);
  customRow.appendChild(customLabel);
  panel.appendChild(customRow);

  return panel;
}

function createSwatch(color: string, isSelected: boolean, onSelect: (color: string) => void): HTMLButtonElement {
  const swatch = document.createElement('button');
  swatch.type = 'button';
  swatch.className = 'notes-color-swatch';
  if (isSelected) swatch.classList.add('is-selected');
  swatch.style.backgroundColor = color;
  if (color === '#ffffff' || color === '#fff') {
    swatch.style.border = '1px solid var(--chc-border-secondary)';
  }
  swatch.title = color;
  swatch.addEventListener('click', () => onSelect(color));
  return swatch;
}

// -- Lists --

function createListGroup(options: NotesToolbarOptions): HTMLDivElement {
  const group = createGroup();
  group.appendChild(
    createButton(
      'orderedList',
      svg(16, 16, '<path d="M3 2h12v2H3zm0 5h12v2H3zm0 5h12v2H3z" fill="currentColor"/><text x="0" y="4" font-size="3.5" fill="currentColor">1</text><text x="0" y="9" font-size="3.5" fill="currentColor">2</text><text x="0" y="14" font-size="3.5" fill="currentColor">3</text>'),
      'Ordered list',
      options.onOrderedList,
    ),
  );
  group.appendChild(
    createButton(
      'bulletList',
      svg(16, 16, '<circle cx="1.5" cy="3" r="1.5" fill="currentColor"/><circle cx="1.5" cy="8" r="1.5" fill="currentColor"/><circle cx="1.5" cy="13" r="1.5" fill="currentColor"/><path d="M5 2h10v2H5zm0 5h10v2H5zm0 5h10v2H5z" fill="currentColor"/>'),
      'Bullet list',
      options.onBulletList,
    ),
  );
  return group;
}

// -- Alignment with SVG icons --

function svg(w: number, h: number, inner: string): string {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

const ALIGN_ICONS: Record<string, string> = {
  alignLeft: svg(
    16,
    16,
    '<path d="M1 2h14v2H1zm0 4h9v2H1zm0 4h14v2H1zm0 4h9v2H1z" fill="currentColor"/>',
  ),
  alignCenter: svg(
    16,
    16,
    '<path d="M1 2h14v2H1zm3.5 4h7v2h-7zM1 10h14v2H1zm3.5 4h7v2h-7z" fill="currentColor"/>',
  ),
  alignRight: svg(
    16,
    16,
    '<path d="M1 2h14v2H1zm6 4h8v2H7zM1 10h14v2H1zm6 4h8v2H7z" fill="currentColor"/>',
  ),
  alignJustify: svg(
    16,
    16,
    '<path d="M1 2h14v2H1zm0 4h14v2H1zm0 4h14v2H1zm0 4h14v2H1z" fill="currentColor"/>',
  ),
};

function createAlignmentGroup(options: NotesToolbarOptions): HTMLDivElement {
  const group = createGroup();
  group.appendChild(createButton('alignLeft', ALIGN_ICONS.alignLeft, 'Align left', () => options.onAlign?.('left')));
  group.appendChild(
    createButton('alignCenter', ALIGN_ICONS.alignCenter, 'Align center', () => options.onAlign?.('center')),
  );
  group.appendChild(
    createButton('alignRight', ALIGN_ICONS.alignRight, 'Align right', () => options.onAlign?.('right')),
  );
  group.appendChild(
    createButton('alignJustify', ALIGN_ICONS.alignJustify, 'Justify', () => options.onAlign?.('justify')),
  );
  return group;
}

// -- Block elements with link/video popovers --

function createBlockGroup(options: NotesToolbarOptions): HTMLDivElement {
  const group = createGroup();
  group.appendChild(createButton('blockquote', '\u201C', 'Blockquote', options.onBlockquote));
  group.appendChild(createButton('codeBlock', '</>', 'Code block', options.onCodeBlock));

  const linkBtn = createButton('link', '\u21D7', 'Insert link');
  attachUrlPopover(linkBtn, 'Enter URL', 'https://', (url) => options.onLink?.(url));
  group.appendChild(linkBtn);

  const videoBtn = createButton('video', '\u25B7', 'Insert video');
  attachUrlPopover(videoBtn, 'YouTube URL', 'https://youtube.com/...', (url) => options.onVideo?.(url));
  group.appendChild(videoBtn);

  return group;
}

function attachUrlPopover(
  btn: HTMLButtonElement,
  label: string,
  placeholder: string,
  onSubmit: (url: string) => void,
): void {
  let tip: Instance | undefined;

  btn.addEventListener('click', () => {
    if (tip) {
      tip.destroy();
      tip = undefined;
      return;
    }

    const panel = document.createElement('div');
    panel.className = 'notes-url-panel';

    const heading = document.createElement('div');
    heading.className = 'notes-url-label';
    heading.textContent = label;
    panel.appendChild(heading);

    const input = document.createElement('input');
    input.type = 'url';
    input.className = 'notes-url-input';
    input.placeholder = placeholder;
    panel.appendChild(input);

    const actions = document.createElement('div');
    actions.className = 'notes-url-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'button notes-url-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      tip?.destroy();
      tip = undefined;
    });

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'button is-info notes-url-confirm';
    confirmBtn.textContent = 'Insert';
    confirmBtn.addEventListener('click', () => {
      const url = input.value.trim();
      if (url) onSubmit(url);
      tip?.destroy();
      tip = undefined;
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    panel.appendChild(actions);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmBtn.click();
      } else if (e.key === 'Escape') {
        cancelBtn.click();
      }
    });

    tip = tippy(btn, {
      content: panel,
      theme: 'light-border',
      trigger: 'manual',
      interactive: true,
      placement: 'bottom-start',
      onShown: () => setTimeout(() => input.focus(), 0),
      onHidden: () => {
        tip?.destroy();
        tip = undefined;
      },
    });
    tip.show();
  });
}

function createClearGroup(options: NotesToolbarOptions): HTMLDivElement {
  const group = createGroup();
  group.appendChild(createButton('clearFormatting', '\u2298', 'Clear formatting', options.onClearFormatting));
  return group;
}
