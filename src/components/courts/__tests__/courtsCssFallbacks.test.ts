import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';

// courts.css ships in the standalone `./features.css` export, which does not carry the theme tokens.
const css = readFileSync(resolve(__dirname, '../courts.css'), 'utf8');

describe('courts.css stands alone', () => {
  it('gives every theme token it reads a fallback', () => {
    const vars = [...css.matchAll(/var\(\s*(--[\w-]+)\s*(,[^)]*)?\)/g)];
    expect(vars.length).toBeGreaterThan(7); // control: the per-sport strokes are read
    const bare = vars.filter(([, , fallback]) => !fallback?.slice(1).trim()).map(([whole]) => whole);
    expect(bare).toEqual([]);
  });
});
