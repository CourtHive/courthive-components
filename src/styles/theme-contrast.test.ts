import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * WCAG contrast between each `--chc-container-*` fill and its `--chc-on-*` foreground.
 *
 * The dark values were DERIVED by this measure rather than hand-picked, and this test is what keeps
 * them honest: change a container fill without revisiting its foreground and the pair fails here
 * rather than in somebody's eyes.
 *
 * The four light-mode failures are asserted EXPLICITLY, not skipped. They are the appearance the
 * product ships today — `#fff` on `#00d1b2` is 1.95:1 — and fixing them flips those buttons to dark
 * text, which is a visible design change rather than a theming correction. Pinning the exact ratios
 * means the decision stays visible and a silent regression is impossible in either direction: improve
 * one and this test fails, telling you to move it out of the exception list.
 */
const THEME = readFileSync(join(__dirname, 'theme.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function block(pattern: RegExp): string {
  const start = THEME.search(pattern);
  const open = THEME.indexOf('{', start);
  let depth = 0;
  let i = open;
  while (i < THEME.length) {
    if (THEME[i] === '{') depth += 1;
    else if (THEME[i] === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
    i += 1;
  }
  return THEME.slice(open + 1, i);
}

function tokens(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--chc-[a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const LIGHT = tokens(block(/:root\s*\{/));
const DARK = tokens(block(/\[data-theme='dark'\]\s*\{/));

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance. An `rgba()` foreground is composited over its own container first. */
function luminance(value: string, over?: string): number {
  const rgba = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/.exec(value);
  let r: number, g: number, b: number, a = 1;
  if (rgba) {
    [r, g, b] = [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])];
    if (rgba[4] !== undefined) a = Number(rgba[4]);
  } else {
    let hex = value.replace('#', '');
    if (hex.length === 3)
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }
  if (a < 1 && over) {
    const base = over.replace('#', '');
    const full =
      base.length === 3
        ? base
            .split('')
            .map((c) => c + c)
            .join('')
        : base;
    const [br, bg, bb] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    r = r * a + br * (1 - a);
    g = g * a + bg * (1 - a);
    b = b * a + bb * (1 - a);
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg: string, bg: string): number {
  const a = luminance(fg, bg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const INTENTS = ['primary', 'link', 'info', 'danger', 'success', 'warning'] as const;

/** Light-mode pairs that ship BELOW AA today. Ratios pinned so neither direction can drift silently. */
const LIGHT_KNOWN_FAILURES: Record<string, number> = {
  primary: 1.95,
  success: 2.14,
  info: 3.51,
  danger: 3.61,
};

describe('--chc-on-* foreground contrast', () => {
  it('defines a foreground for every container, in both themes', () => {
    for (const intent of INTENTS) {
      expect(LIGHT[`--chc-on-${intent}`], `light on-${intent}`).toBeTruthy();
      expect(DARK[`--chc-on-${intent}`], `dark on-${intent}`).toBeTruthy();
      expect(LIGHT[`--chc-container-${intent}`], `light container-${intent}`).toBeTruthy();
      expect(DARK[`--chc-container-${intent}`], `dark container-${intent}`).toBeTruthy();
    }
  });

  it.each(INTENTS)('dark: on-%s meets WCAG AA against its container', (intent) => {
    const ratio = contrast(DARK[`--chc-on-${intent}`], DARK[`--chc-container-${intent}`]);
    expect(ratio, `dark on-${intent} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it.each(INTENTS.filter((i) => !(i in LIGHT_KNOWN_FAILURES)))(
    'light: on-%s meets WCAG AA against its container',
    (intent) => {
      const ratio = contrast(LIGHT[`--chc-on-${intent}`], LIGHT[`--chc-container-${intent}`]);
      expect(ratio, `light on-${intent} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(Object.entries(LIGHT_KNOWN_FAILURES))(
    'light: on-%s still ships its KNOWN failing ratio (~%s:1)',
    (intent, expected) => {
      const ratio = contrast(LIGHT[`--chc-on-${intent}`], LIGHT[`--chc-container-${intent}`]);
      // Fails if it gets worse OR if it is fixed — a fix should move it out of the exception list.
      expect(ratio, `light on-${intent} = ${ratio.toFixed(2)}:1`).toBeCloseTo(Number(expected), 1);
    },
  );
});
