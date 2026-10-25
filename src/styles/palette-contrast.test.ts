import { THEME_PALETTES, DEFAULT_DARK_PALETTE, DEFAULT_LIGHT_PALETTE } from '../theme/palettes';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every palette, defaults included, held to the same contrast pairs.
 *
 * A palette is the mode's default block (theme.css) with its own block (palettes.css) laid over it, which is
 * exactly how the cascade resolves `:root[data-theme][data-palette]` over `:root` / `[data-theme='dark']`.
 * Measured on the resolved values, so a palette that forgets a token is measured against the default's value
 * for it — the combination a user would actually see.
 *
 * Thresholds: 4.5:1 for text (WCAG 1.4.3); 3:1 for non-text marks — input edges, focus rings, icons, category
 * colors (1.4.11).
 */
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const THEME = strip(readFileSync(join(__dirname, 'theme.css'), 'utf8'));
const PALETTES_CSS = strip(readFileSync(join(__dirname, 'palettes.css'), 'utf8'));

function block(css: string, header: RegExp): string | undefined {
  const start = css.search(header);
  if (start < 0) return undefined;
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open));
}

function tokens(body = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const DEFAULTS = {
  light: tokens(block(THEME, /^:root\s*\{/m)),
  dark: { ...tokens(block(THEME, /^:root\s*\{/m)), ...tokens(block(THEME, /^\[data-theme='dark'\]\s*\{/m)) }
};

function paletteBlock(id: string, mode: string) {
  return block(PALETTES_CSS, new RegExp(`:root\\[data-theme='${mode}'\\]\\[data-palette='${id}'\\]\\s*\\{`));
}

function resolved(id: string, mode: 'light' | 'dark'): Record<string, string> {
  return { ...DEFAULTS[mode], ...tokens(paletteBlock(id, mode)) };
}

function value(map: Record<string, string>, token: string, depth = 0): string {
  const raw = map[token];
  const ref = /^var\((--[a-z0-9-]+)\)$/.exec(raw ?? '');
  if (ref && depth < 10) return value(map, ref[1], depth + 1);
  return raw;
}

function rgb(hex: string): number[] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5;
const MARK = 3;
const PAGE = '--chc-bg-primary';
const INK = '--chc-text-primary';
const CHROME = '--chc-chrome-bg';
const SURFACES = [PAGE, '--chc-bg-secondary', '--chc-bg-elevated', '--chc-canvas'];

type Pair = [fg: string, bg: string, min: number];
/** Every foreground in `fgs` against one background. */
const on = (bg: string, min: number, fgs: string[]): Pair[] => fgs.map((fg): Pair => [fg, bg, min]);

const PAIRS: Pair[] = [
  ...SURFACES.flatMap((surface) => on(surface, TEXT, [INK, '--chc-text-secondary', '--chc-text-muted'])),
  ...on(PAGE, TEXT, [
    '--chc-status-success',
    '--chc-status-warning',
    '--chc-status-error',
    '--chc-status-info',
    '--chc-text-link',
    '--chc-accent-text',
    '--chc-draw-position-color'
  ]),
  ...[
    '--chc-panel-header-bg',
    '--chc-participant-hover-bg',
    '--chc-hover-bg',
    '--chc-active-bg',
    '--chc-bg-tertiary',
    '--chc-bg-highlight'
  ].map((bg): Pair => [INK, bg, TEXT]),
  ['--chc-chrome-text', CHROME, TEXT],
  ['--chc-chrome-icon', CHROME, MARK],
  ['--chc-chrome-active', CHROME, MARK],
  ['--chc-chrome-danger', CHROME, MARK],
  ['--chc-chrome-success', CHROME, MARK],
  ['--chc-input-border', '--chc-input-bg', MARK],
  ['--chc-border-focus', PAGE, MARK],
  ...['danger', 'success', 'warning', 'dark'].map((pill): Pair => ['--chc-pill-text', `--chc-pill-bg-${pill}`, TEXT]),
  ['--chc-clear-btn-text', '--chc-clear-btn-bg', TEXT],
  ...['primary', 'link', 'info', 'danger', 'success', 'warning'].map((intent): Pair => [
    `--chc-on-${intent}`,
    `--chc-container-${intent}`,
    TEXT
  ]),
  ...on(PAGE, MARK, [
    ...['male', 'female', 'mixed'].map((g) => `--chc-gender-${g}`),
    ...['singles', 'doubles', 'team', 'hybrid'].map((e) => `--chc-eventtype-${e}`)
  ]),
  ...on('--sp-bg', TEXT, ['--sp-text', '--sp-muted']),
  ...on('--sp-panel', TEXT, [
    '--sp-text',
    '--sp-muted',
    '--sp-ok-text',
    '--sp-warn-text',
    '--sp-err-text',
    '--sp-accent-text'
  ])
];

const CASES = THEME_PALETTES.flatMap((palette) =>
  PAIRS.map(([fg, bg, min]) => ({ id: palette.id, mode: palette.mode, fg, bg, min }))
);

describe('palette catalog', () => {
  it('defaults are one light and one dark palette from the catalog', () => {
    expect(THEME_PALETTES.find((p) => p.id === DEFAULT_LIGHT_PALETTE)?.mode).toBe('light');
    expect(THEME_PALETTES.find((p) => p.id === DEFAULT_DARK_PALETTE)?.mode).toBe('dark');
  });

  it.each(THEME_PALETTES.filter((p) => ![DEFAULT_LIGHT_PALETTE, DEFAULT_DARK_PALETTE].includes(p.id)))(
    '$id has a block in palettes.css keyed on its own mode',
    ({ id, mode }) => {
      expect(paletteBlock(id, mode), `${id} block`).toBeTruthy();
    }
  );

  it('palettes.css has no block for a palette the catalog does not list', () => {
    const ids = [...PALETTES_CSS.matchAll(/\[data-palette='([a-z-]+)'\]/g)].map((m) => m[1]);
    for (const id of ids)
      expect(
        THEME_PALETTES.some((p) => p.id === id),
        id
      ).toBe(true);
  });

  it('palettes.css declares custom properties only', () => {
    const declarations = [...PALETTES_CSS.matchAll(/\{([^}]*)\}/g)].flatMap((m) =>
      m[1]
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean)
    );
    for (const declaration of declarations) expect(declaration.startsWith('--'), declaration).toBe(true);
  });
});

/** `color-mix(in srgb, a pct%, b)`, as buttons.css uses it. */
function mix(a: string, b: string, pct: number): string {
  const [x, y] = [rgb(a), rgb(b)];
  return (
    '#' +
    x
      .map((c, i) =>
        Math.round(c * pct + y[i] * (1 - pct))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

const INTENT_INK: Record<string, string> = {
  info: '--chc-status-info',
  success: '--chc-status-success',
  danger: '--chc-status-error',
  warning: '--chc-status-warning',
  primary: '--chc-primary-text',
  link: '--chc-accent-text'
};

const BUTTON_CASES = THEME_PALETTES.flatMap((palette) =>
  Object.keys(INTENT_INK).map((intent) => ({ id: palette.id, mode: palette.mode, intent }))
);

describe('button intent shades (buttons.css color-mix)', () => {
  it.each(BUTTON_CASES)('$id: $intent', ({ id, mode, intent }) => {
    const map = resolved(id, mode);
    const fill = value(map, `--chc-container-${intent}`);
    const on = value(map, `--chc-on-${intent}`);
    const ink = value(map, INTENT_INK[intent]);
    const bg = value(map, PAGE);
    const checks: [string, string, string][] = [
      ['on-* over hover (88% toward black)', on, mix(fill, '#000000', 0.88)],
      ['on-* over active (78% toward black)', on, mix(fill, '#000000', 0.78)],
      ['ink on the page (outlined)', ink, bg],
      ['ink on the 10% light tint', ink, mix(fill, bg, 0.1)],
      ['ink on the 16% light hover tint', ink, mix(fill, bg, 0.16)]
    ];
    for (const [label, fg, back] of checks) {
      const ratio = contrast(fg, back);
      expect(ratio, `${id} ${intent} ${label}: ${fg} on ${back} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(TEXT);
    }
  });
});

describe('palette contrast', () => {
  it.each(CASES)('$id: $fg on $bg ≥ $min', ({ id, mode, fg, bg, min }) => {
    const map = resolved(id, mode);
    const [f, b] = [value(map, fg), value(map, bg)];
    expect(f, `${id} ${fg}`).toMatch(/^#[0-9a-f]{3,6}$/i);
    expect(b, `${id} ${bg}`).toMatch(/^#[0-9a-f]{3,6}$/i);
    const ratio = contrast(f, b);
    expect(ratio, `${id}: ${fg} ${f} on ${bg} ${b} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(min);
  });
});
