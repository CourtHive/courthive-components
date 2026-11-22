/** Qualify the public scoring entry from source, built output and independently installed tarballs. */
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { build, preview } from 'vite';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const fixture = join(root, 'scripts/verify/fixtures/score-entry');
const probe = join(root, 'src/__score_entry_guard__.ts');
const pureFactory =
  /^(scoreEntryState|constants|helpers\/matchUpFormatCode|query\/matchUp|scoring\/(kernel|analysis|views))\//;

function problems(modules, code) {
  const bad = modules.filter((id) => {
    if (/courthive-components\.(es|umd)\.js/.test(id)) return true;
    if (!id.includes('tods-competition-factory')) return false;
    const path = id.split('/dist/esm/')[1];
    return !path || (!pureFactory.test(path) && !/^tools\/(numeric|objects|ensureInt)\./.test(path));
  });
  if (/\b(fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker)\b/.test(code))
    bad.push('transport or persistence');
  return bad;
}

function capture() {
  let modules = [];
  return {
    plugin: {
      name: 'score-entry-graph',
      generateBundle() {
        modules = [...this.getModuleIds()];
      }
    },
    read: () => modules
  };
}

async function graph(entry, plant = '') {
  const traced = capture();
  const result = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [
      traced.plugin,
      {
        name: 'score-entry-probe',
        resolveId: (id) => (id === probe ? probe : undefined),
        load: (id) => (id === probe ? `export * from '${entry}'; ${plant}` : undefined)
      }
    ],
    build: { write: false, minify: true, lib: { entry: probe, formats: ['es'] } }
  });
  const output = (Array.isArray(result) ? result : [result]).flatMap((item) => item.output);
  const js = output
    .filter((item) => item.type === 'chunk')
    .map((item) => item.code)
    .join('\n');
  return { bad: problems(traced.read(), js), bytes: Buffer.byteLength(js), gzip: gzipSync(js).length };
}

async function verifyGraphs() {
  for (const entry of ['./components/scoring/index', '../dist/score-entry.mjs']) {
    const result = await graph(entry);
    assert.equal(result.bad.length, 0, `Forbidden score-entry dependency: ${result.bad.slice(0, 3).join(', ')}`);
    console.log(`[score-entry] ${entry}: ${result.bytes} JS bytes / ${result.gzip} gzip; no engine/root/transport`);
  }
  for (const [label, plant] of Object.entries({
    root: "export { tournamentEngine } from 'tods-competition-factory';",
    governors: "export * from 'tods-competition-factory/governors';",
    transport: "fetch('/factory');",
    storage: "localStorage.setItem('record', 'protected');",
    indexedDB: "indexedDB.open('protected');"
  })) {
    assert.ok((await graph('./components/scoring/index', plant)).bad.length, `Guard missed planted ${label}`);
    console.log(`[score-entry] detected deliberately planted ${label}`);
  }
  assert.equal(
    (
      await graph(
        './components/scoring/index',
        "import type { Tournament } from 'tods-competition-factory'; export type { Tournament };"
      )
    ).bad.length,
    0,
    'Type-only root imports must erase'
  );
  const entry = await import(pathToFileURL(join(root, 'dist/score-entry.mjs')).href);
  assert.deepEqual(
    Object.keys(entry).sort((a, b) => a.localeCompare(b)),
    ['getMatchUpFormatModal', 'openScoreEntryDialog']
  );
  const css = readFileSync(join(root, 'dist/score-entry.css'), 'utf8');
  for (const marker of ['.chc-modal-container', '.chc-sec', '.chc-mfc-modal', '.switch'])
    assert.ok(css.includes(marker));
  assert.ok(!css.includes('.chc-structure'), 'Scoring CSS must not include bracket styles');
  console.log(`[score-entry] public exports import without DOM; isolated CSS ${Buffer.byteLength(css)} bytes`);
}

function compileConsumer(consumer) {
  const program = ts.createProgram([join(consumer, 'main.ts'), join(consumer, 'css.d.ts')], {
    noEmit: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    types: [],
    strict: true
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => consumer,
      getCanonicalFileName: (name) => name,
      getNewLine: () => '\n'
    })
  );
}

async function browserChecks(url) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    for (const theme of ['light', 'dark'])
      for (const width of [320, 390, 736]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        const errors = [];
        page.on('pageerror', () => errors.push('PAGE_ERROR'));
        await page.addInitScript(() => {
          globalThis.__cspViolations = [];
          globalThis.document.addEventListener('securitypolicyviolation', (event) =>
            globalThis.__cspViolations.push(event.effectiveDirective)
          );
        });
        await page.goto(`${url}?theme=${theme}`);
        await page.getByRole('button', { name: 'Record result', exact: true }).click();
        const modal = page.getByRole('dialog').last();
        const input = (side, set) => modal.locator(`input[data-side="${side}"][data-set="${set}"]`);
        await input(2, 1).fill('4');
        assert.equal(await input(1, 1).inputValue(), '6', 'Canonical Smart complement');
        await modal.locator('[data-action=editFormat]').click();
        const picker = page.getByRole('dialog').last();
        await picker.locator('#matchUpFormatSelector').selectOption('SET3-S:6NOAD/TB7-F:TB10');
        const pickerOverflow = await picker.evaluate((el) => el.scrollWidth > el.clientWidth);
        assert.equal(pickerOverflow, false, 'Format picker overflow');
        await picker.getByRole('button', { name: 'Select', exact: true }).click();
        await input(1, 2).fill('4');
        await input(2, 3).fill('8');
        assert.equal(await input(1, 3).inputValue(), '10', 'Canonical deciding tiebreak');
        assert.equal(await modal.evaluate((el) => el.scrollWidth > el.clientWidth), false, 'Score dialog overflow');
        assert.equal(
          await page.evaluate(() => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth),
          false,
          'Page overflow'
        );
        await modal.locator('[data-action=submit]').click();
        const read = async () => JSON.parse(await page.locator('#evidence').textContent());
        assert.equal((await read()).phase, 'saving');
        assert.equal((await read()).outcome.matchUpFormat, 'SET3-S:6NOAD/TB7-F:TB10');
        assert.equal((await read()).outcome.score.sets[2].side1TiebreakScore, 10);
        await modal.getByRole('button', { name: 'Refuse', exact: true }).click();
        await modal.locator('[data-action=submit]').click();
        await modal.getByRole('button', { name: 'Lose acknowledgment', exact: true }).click();
        assert.equal(await modal.locator('[data-action=submit]').isDisabled(), true);
        await modal.getByRole('button', { name: 'Check command', exact: true }).click();
        assert.equal((await read()).phase, 'projection-pending');
        assert.equal((await read()).sends, 2, 'Recovery must not resend');
        assert.equal((await read()).checks, 1);
        await modal.getByRole('button', { name: 'Publish', exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'detached' });
        assert.equal(await page.locator('#open').evaluate((el) => el === globalThis.document.activeElement), true);
        await page.reload();
        await page.getByRole('button', { name: 'Record result', exact: true }).click();
        await modal.locator('[data-action=switchApproach]').click();
        await modal.locator('[data-approach=freeScore]').click();
        await modal.locator('input[data-free-score]').fill('6-4 6-3');
        assert.equal(await modal.locator('[data-action=submit]').isEnabled(), true, 'Free Score validates');
        await modal.locator('[data-action=switchApproach]').click();
        await modal.locator('[data-approach=dialPad]').click();
        assert.equal(await modal.locator('[data-digit]').count(), 10);
        assert.equal(
          await modal.locator('[data-action=submit]').isEnabled(),
          true,
          'Approach switch preserves canonical model'
        );
        await modal.locator('[data-action=submit]').click();
        assert.equal((await read()).outcome.score.sets.length, 2);
        await modal.getByRole('button', { name: 'Accept', exact: true }).click();
        assert.equal(await page.getByRole('dialog').count(), 1, 'Acceptance still waits for refresh');
        await modal.getByRole('button', { name: 'Publish', exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'detached' });
        assert.deepEqual(errors, []);
        assert.deepEqual(await page.evaluate(() => globalThis.__cspViolations), [], 'Strict CSP violations');
        console.log(
          `[score-entry] packed Chromium ${theme} ${width}px: Smart/format/FreeScore/DialPad/submit/refuse/recover/refresh/focus/CSP OK`
        );
        await page.close();
      }
  } finally {
    await browser.close();
  }
}

async function verifyPacked(componentsTarball, factoryTarball) {
  const consumer = mkdtempSync(join(tmpdir(), 'packed-score-entry-'));
  let server;
  try {
    for (const file of ['index.html', 'main.ts', 'model.ts', 'theme.css', 'css.d.ts'])
      copyFileSync(join(fixture, file), join(consumer, file));
    writeFileSync(
      join(consumer, 'package.json'),
      JSON.stringify({
        private: true,
        type: 'module',
        dependencies: {
          'courthive-components': `file:${resolve(componentsTarball)}`,
          'tods-competition-factory': /^\d+\.\d+\.\d+$/.test(factoryTarball)
            ? factoryTarball
            : `file:${resolve(factoryTarball)}`
        }
      })
    );
    writeFileSync(
      join(consumer, 'pnpm-workspace.yaml'),
      'packages: [.]\nallowBuilds: {}\nautoInstallPeers: false\nminimumReleaseAge: 1440\n'
    );
    execFileSync('pnpm', ['install', '--ignore-scripts'], { cwd: consumer, stdio: 'pipe', timeout: 120_000 });
    compileConsumer(consumer);
    const traced = capture();
    const result = await build({
      root: consumer,
      configFile: false,
      logLevel: 'silent',
      plugins: [traced.plugin],
      build: { outDir: 'app', minify: true, modulePreload: { polyfill: false } }
    });
    const js = result.output
      .filter((item) => item.type === 'chunk')
      .map((item) => item.code)
      .join('\n');
    assert.equal(problems(traced.read(), js).length, 0, 'Packed consumer reached forbidden modules');
    server = await preview({
      root: consumer,
      configFile: false,
      logLevel: 'silent',
      build: { outDir: 'app' },
      preview: {
        host: '127.0.0.1',
        port: 0,
        headers: {
          'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'"
        }
      }
    });
    await browserChecks(server.resolvedUrls.local[0]);
    console.log('[score-entry] packed types + production browser graph OK; no sibling links');
  } finally {
    if (server) await new Promise((done) => server.httpServer.close(done));
    rmSync(consumer, { recursive: true, force: true });
  }
}

async function checkPackage() {
  const staging = mkdtempSync(join(tmpdir(), 'score-entry-pack-'));
  try {
    const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    execFileSync('pnpm', ['pack', '--pack-destination', staging], { cwd: root, stdio: 'pipe', timeout: 120_000 });
    await verifyPacked(
      join(staging, `courthive-components-${manifest.version}.tgz`),
      manifest.devDependencies['tods-competition-factory']
    );
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

const packed = process.argv.indexOf('--packed');
if (process.argv.includes('--pack-check')) await checkPackage();
else if (packed < 0) await verifyGraphs();
else {
  assert.ok(
    process.argv[packed + 1] && process.argv[packed + 2],
    'Use --packed <components.tgz> <factory.tgz-or-version>'
  );
  await verifyPacked(process.argv[packed + 1], process.argv[packed + 2]);
}
