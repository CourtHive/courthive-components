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
 * Both themes are held to AA with no exception list. Four light pairs were below it until
 * 2026-09-23 — `#fff` on `#00d1b2` was 1.95:1 — because a solid fill was assumed to want white
 * text, and only `.is-warning` had ever been corrected by hand. That correction was made once and
 * never propagated, which is the failure mode a derived value plus this test removes.
 *
 * `on-warning` is an `rgba()`, so it is composited over its own container before measuring; a
 * translucent foreground measured against nothing would report a luminance it never renders at.
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
  let r: number,
    g: number,
    b: number,
    a = 1;
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

  it.each(INTENTS)('light: on-%s meets WCAG AA against its container', (intent) => {
    const ratio = contrast(LIGHT[`--chc-on-${intent}`], LIGHT[`--chc-container-${intent}`]);
    expect(ratio, `light on-${intent} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });
});
