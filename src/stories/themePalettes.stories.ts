import { THEME_PALETTES, DEFAULT_DARK_PALETTE, DEFAULT_LIGHT_PALETTE } from '../theme/palettes';
import '../styles/palettes.css';

/**
 * The palette catalog and the live values of the selected palette's key tokens.
 *
 * Palettes are keyed on `data-theme` + `data-palette` on <html>, so only one renders at a time: pick it from the
 * toolbar (Theme for light/dark, Palette for the palette) and the table below re-reads its tokens.
 */
export default {
  title: 'Overview/Theme & Palettes',
  parameters: { layout: 'padded' }
};

const GROUPS: [string, string[]][] = [
  ['Surfaces', ['--chc-canvas', '--chc-bg-primary', '--chc-bg-secondary', '--chc-bg-tertiary', '--chc-bg-elevated']],
  ['Text', ['--chc-text-primary', '--chc-text-secondary', '--chc-text-muted', '--chc-text-link', '--chc-accent-text']],
  ['Borders', ['--chc-border-secondary', '--chc-border-primary', '--chc-border-strong', '--chc-border-focus']],
  ['App chrome', ['--chc-chrome-bg', '--chc-chrome-text', '--chc-chrome-icon', '--chc-chrome-active']],
  ['Status (text-safe)', ['--chc-status-success', '--chc-status-warning', '--chc-status-error', '--chc-status-info']],
  ['States', ['--chc-hover-bg', '--chc-selected-bg', '--chc-active-bg', '--chc-bg-highlight']]
];
const FILLS = ['primary', 'link', 'info', 'success', 'warning', 'danger'];

function el(tag: string, css = '', text = ''): HTMLElement {
  const node = document.createElement(tag);
  if (css) node.style.cssText = css;
  if (text) node.textContent = text;
  return node;
}

function swatch(color: string, size = 28): HTMLElement {
  return el(
    'span',
    `display:inline-block;width:${size}px;height:${size}px;border-radius:6px;background:${color};` +
      'border:1px solid var(--chc-border-secondary);flex:0 0 auto;'
  );
}

function catalog(active: string): HTMLElement {
  const wrap = el(
    'div',
    'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin:12px 0 28px;'
  );
  for (const palette of THEME_PALETTES) {
    const isDefault = palette.id === DEFAULT_LIGHT_PALETTE || palette.id === DEFAULT_DARK_PALETTE;
    const card = el(
      'div',
      'border:1px solid var(--chc-border-secondary);border-radius:10px;padding:12px;background:var(--chc-bg-elevated);' +
        (palette.id === active ? 'outline:2px solid var(--chc-border-focus);outline-offset:2px;' : '')
    );
    const head = el('div', 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;');
    head.appendChild(el('strong', '', palette.name));
    head.appendChild(
      el(
        'span',
        'font-size:12px;color:var(--chc-text-secondary);',
        `${palette.mode}${isDefault ? ' · default' : ''}${palette.id === active ? ' · showing' : ''}`
      )
    );
    const row = el('div', 'display:flex;gap:4px;');
    palette.swatches.forEach((color) => row.appendChild(swatch(color, 24)));
    card.append(head, row);
    wrap.appendChild(card);
  }
  return wrap;
}

function tokenTable(): HTMLElement {
  const root = getComputedStyle(document.documentElement);
  const wrap = el('div', 'display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;');
  for (const [title, tokens] of GROUPS) {
    const group = el('div');
    group.appendChild(el('h4', 'margin:0 0 8px;', title));
    for (const token of tokens) {
      const row = el('div', 'display:flex;align-items:center;gap:10px;margin:4px 0;font-size:13px;');
      row.appendChild(swatch(`var(${token})`));
      row.appendChild(el('code', 'flex:1;', token));
      row.appendChild(
        el('span', 'color:var(--chc-text-secondary);font-family:monospace;', root.getPropertyValue(token).trim())
      );
      group.appendChild(row);
    }
    wrap.appendChild(group);
  }
  return wrap;
}

function fills(): HTMLElement {
  const row = el('div', 'display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;');
  for (const intent of FILLS) {
    row.appendChild(
      el(
        'span',
        `padding:6px 12px;border-radius:999px;font-weight:600;font-size:13px;` +
          `background:var(--chc-container-${intent});color:var(--chc-on-${intent});`,
        intent
      )
    );
  }
  return row;
}

// Named after the page, so Storybook shows it as one sidebar entry rather than a folder holding one story.
export const ThemeAndPalettes = {
  name: 'Theme & Palettes',
  render: () => {
    const active = document.documentElement.dataset.palette ?? '';
    const page = el('div', 'max-width:1100px;color:var(--chc-text-primary);font-family:system-ui,sans-serif;');
    page.appendChild(el('h2', 'margin:0 0 4px;', 'Palettes'));
    page.appendChild(
      el(
        'p',
        'margin:0;color:var(--chc-text-secondary);',
        'One light and one dark palette per user. Courtside and Midnight are the defaults; pick another with the ' +
          'toolbar to see its tokens below. Every pair here is held to WCAG AA by palette-contrast.test.ts.'
      )
    );
    page.appendChild(catalog(active));
    page.appendChild(el('h3', 'margin:0 0 12px;', 'Key tokens — the palette showing now'));
    page.appendChild(tokenTable());
    page.appendChild(el('h4', 'margin:24px 0 0;', 'Fills with their ink (--chc-container-* / --chc-on-*)'));
    page.appendChild(fills());
    return page;
  }
};
