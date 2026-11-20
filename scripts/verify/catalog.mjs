/** Reproduce the card extraction against its real catalog parent, with native cross-browser drag. */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { build, preview } from 'vite';
import { chromium, firefox, webkit } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const baseline = process.argv[2] ?? '02060a74';
const evidence = resolve(process.argv[3] ?? join(tmpdir(), 'cmx-catalog-evidence'));
const staged = mkdtempSync(join(tmpdir(), 'catalog-regression-'));
const files = ['src/components/schedule-page/ui/matchUpCard.ts', 'src/components/schedule-page/ui/schedule-page.css'];
const old = new Map(
  files.map((file) => [
    join(root, file),
    execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root, encoding: 'utf8', timeout: 10_000 })
  ])
);
const servers = [];
const results = [];
mkdirSync(evidence, { recursive: true });
try {
  for (const mode of ['before', 'after']) {
    const outDir = join(staged, mode);
    await build({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: mode === 'before' ? [{ name: 'original-card-css', load: (id) => old.get(id) }] : [],
      build: {
        outDir,
        emptyOutDir: true,
        rollupOptions: { input: join(root, 'scripts/verify/fixtures/catalog/index.html') }
      }
    });
    servers.push(
      await preview({
        root,
        configFile: false,
        logLevel: 'silent',
        build: { outDir },
        preview: { host: '127.0.0.1', port: 0 }
      })
    );
  }
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const theme of ['light', 'dark']) {
        const page = await browser.newPage({ viewport: { width: 900, height: 820 } });
        const errors = [];
        page.on('pageerror', () => errors.push('PAGE_ERROR'));
        for (const [index, mode] of ['before', 'after'].entries()) {
          await page.goto(
            `${servers[index].resolvedUrls.local[0]}scripts/verify/fixtures/catalog/index.html?theme=${theme}`
          );
          await page.locator('.spl-matchup-card').first().waitFor();
          await page
            .locator('#catalog')
            .screenshot({ path: join(evidence, `${name}-${theme}-${mode}.png`), animations: 'disabled' });
        }
        const samePixels = readFileSync(join(evidence, `${name}-${theme}-before.png`)).equals(
          readFileSync(join(evidence, `${name}-${theme}-after.png`))
        );
        const card = page.locator('[data-matchup-id="unplayed-1"]');
        const accessible = await card.ariaSnapshot();
        const completed = await page.locator('[data-matchup-id="completed-1"]').ariaSnapshot();
        const fullLabel =
          accessible.includes('Ann Example') &&
          accessible.includes('10:30') &&
          accessible.includes('Court 1') &&
          completed.includes('11:00') &&
          completed.includes('Court 2') &&
          completed.includes('COMPLETED');
        await card.dragTo(page.locator('#court'));
        let nativeDrag = false;
        let received = '';
        try {
          await page.waitForFunction(
            () => globalThis.document.querySelector('#evidence').textContent !== '',
            undefined,
            { timeout: 5000 }
          );
          received = await page.locator('#evidence').textContent();
          const payload = JSON.parse(received);
          nativeDrag = payload.id === 'unplayed-1' && payload.type === 'CATALOG_MATCHUP' && payload.trusted === true;
        } catch {
          /* Record every engine, even if one fails to deliver a native drop. */
        }
        results.push({ engine: name, theme, samePixels, fullLabel, nativeDrag, received, errors });
        console.log(JSON.stringify(results.at(-1)));
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }
  writeFileSync(join(evidence, 'results.json'), JSON.stringify({ baseline, results }, null, 2) + '\n');
  assert.ok(
    results.every((result) => result.nativeDrag && result.fullLabel && result.samePixels && !result.errors.length),
    'Catalog regression; see saved results and before/after PNGs'
  );
} finally {
  for (const server of servers) await new Promise((done) => server.httpServer.close(done));
  rmSync(staged, { recursive: true, force: true });
}
