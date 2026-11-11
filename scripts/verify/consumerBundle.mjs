#!/usr/bin/env node
/** Consumer bundle budgets: built package entries, minified ESM, gzip level 9, +10% growth gate.
 * Mirrors factory verify:consumer-bundle's consumer fixtures and explicit baseline-update workflow.
 * Uses this package's declared Vite dependency. Factory is external, so its release size cannot invalidate this package budget. CSS is measured separately.
 */
import { mkdtemp, readFile, readdir, writeFile, rm, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { build } from 'vite';
import ts from 'typescript';

const root = fileURLToPath(new URL('../../', import.meta.url));
const baselinePath = join(root, 'scripts/verify/baseline/consumer-bundle.json');
const fixtures = {
  rootCourts: [
    'courthive-components',
    ['tennisCourt', 'basketballCourt', 'baseballDiamond', 'hockeyRink', 'pickleballCourt', 'badmintonCourt']
  ],
  courts: [
    'courthive-components/courts',
    ['tennisCourt', 'basketballCourt', 'baseballDiamond', 'hockeyRink', 'pickleballCourt', 'badmintonCourt']
  ],
  rootHelper: ['courthive-components', ['buildSegmentedBar']],
  helper: ['courthive-components/segmented-bar', ['buildSegmentedBar']]
};
function exceedsBudget(current, baseline) {
  return !baseline || ['bytes', 'gzip'].some((metric) => current[metric] > baseline[metric] * 1.1);
}

// Dependencies whose module state a host configures on ITS copy, so this package must import theirs rather
// than bundle its own. `marker` is a string only that package's code contains (vanillajs-datepicker's
// base locale carries `titleFormat`; dayjs's `weekdaysMin` is why the marker is not `daysMin`).
const sharedModules = [{ specifier: 'vanillajs-datepicker', marker: 'titleFormat' }];
function sharedModuleProblems(files) {
  const problems = [];
  for (const { specifier, marker } of sharedModules) {
    for (const [file, code] of Object.entries(files))
      if (code.includes(marker)) problems.push(`${file} bundles its own ${specifier}`);
    if (!Object.values(files).some((code) => code.includes(specifier)))
      problems.push(`no built entry imports ${specifier}`);
  }
  return problems;
}

if (process.argv.includes('--self-test')) {
  assert.equal(exceedsBudget({ bytes: 100, gzip: 100 }, { bytes: 100, gzip: 100 }), false);
  assert.equal(exceedsBudget({ bytes: 111, gzip: 100 }, { bytes: 100, gzip: 100 }), true);
  assert.equal(exceedsBudget({ bytes: 100, gzip: 111 }, { bytes: 100, gzip: 100 }), true);
  assert.equal(exceedsBudget({ bytes: 1, gzip: 1 }, undefined), true);
  assert.deepEqual(sharedModuleProblems({ 'a.js': 'await import("vanillajs-datepicker")' }), []);
  assert.equal(
    sharedModuleProblems({ 'a.js': 'import("vanillajs-datepicker")', 'b.mjs': '{titleFormat:"MM y"}' }).length,
    1
  );
  assert.equal(sharedModuleProblems({ 'a.js': 'const x = 1' }).length, 1);
  console.log('[consumer-bundle] detector fixtures passed');
  process.exit(0);
}

// Compile as a consumer: feature types must expose their actual exports, without root-only symbols.
const types = ts.createProgram([join(root, 'scripts/verify/featureExports.mts')], {
  noEmit: true,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  target: ts.ScriptTarget.ES2020,
  types: [],
  strict: true
});
const typeErrors = ts.getPreEmitDiagnostics(types);
if (typeErrors.length)
  throw new Error(
    ts.formatDiagnosticsWithColorAndContext(typeErrors, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: (name) => name,
      getNewLine: () => '\n'
    })
  );

// The package's own built files, not a consumer fixture: a bundled copy is in `dist` whatever a consumer imports.
const built = {};
for (const file of (await readdir(join(root, 'dist'))).filter((name) => /\.(js|mjs)$/.test(name)))
  built[file] = await readFile(join(root, 'dist', file), 'utf8');
const sharing = sharedModuleProblems(built);
if (sharing.length) throw new Error(`[consumer-bundle] shared module state:\n  ${sharing.join('\n  ')}`);
console.log(
  `[consumer-bundle] shared modules imported, not bundled: ${sharedModules.map((m) => m.specifier).join(', ')}`
);

const directory = await mkdtemp(join(tmpdir(), 'components-consumer-'));
const measurements = {};
try {
  for (const [name, [specifier, symbols]] of Object.entries(fixtures)) {
    const entry = join(directory, `${name}.mjs`);
    await writeFile(
      entry,
      `import { ${symbols.join(', ')} } from ${JSON.stringify(specifier)}; console.log(${symbols.map((symbol) => `typeof ${symbol}`).join(', ')});`
    );
    const result = await build({
      configFile: false,
      root,
      logLevel: 'silent',
      resolve: { alias: [{ find: specifier, replacement: fileURLToPath(import.meta.resolve(specifier)) }] },
      build: {
        write: false,
        minify: true,
        lib: { entry, formats: ['es'] },
        rollupOptions: {
          external: (id) => id === 'tods-competition-factory' || id.startsWith('tods-competition-factory/')
        }
      }
    });
    let bytes = 0;
    let gzip = 0;
    for (const output of (Array.isArray(result) ? result : [result]).flatMap((bundle) => bundle.output)) {
      if (output.type !== 'chunk') continue;
      bytes += Buffer.byteLength(output.code);
      gzip += gzipSync(output.code, { level: 9 }).length;
    }
    measurements[name] = { bytes, gzip };
    console.log(`[consumer-bundle] ${name}: ${bytes} JS bytes / ${gzip} gzip bytes`);
  }
  const css = await readFile(join(root, 'dist/features.css'));
  measurements.featuresCss = { bytes: css.length, gzip: gzipSync(css, { level: 9 }).length };
  if (process.argv.includes('--update-baseline')) {
    await mkdir(resolve(baselinePath, '..'), { recursive: true });
    await writeFile(baselinePath, JSON.stringify(measurements, null, 2) + '\n');
  } else {
    const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
    for (const [name, current] of Object.entries(measurements)) {
      if (exceedsBudget(current, baseline[name])) {
        throw new Error(
          `${name} exceeds the consumer budget; inspect the change before explicitly updating the baseline`
        );
      }
    }
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
