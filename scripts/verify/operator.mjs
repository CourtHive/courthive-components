/** The first read-only operator entry renders DTOs only. No factory runtime, root components, transport or storage. */
import { existsSync, realpathSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { build } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ENTRY = join(ROOT, 'src/components/operator/index.ts');
const MODEL = join(ROOT, 'src/components/operator/model.ts');
const DIST = join(ROOT, 'dist/operator.mjs');

async function graph(entry, contents) {
  const probe = join(dirname(ENTRY), '__operator_guard__.ts');
  let modules = [];
  const result = await build({
    configFile: false,
    root: ROOT,
    logLevel: 'silent',
    plugins: [
      {
        name: 'operator-module-graph',
        resolveId(id) {
          if (contents !== undefined && id === probe) return probe;
        },
        load(id) {
          if (contents !== undefined && id === probe) return contents;
        },
        generateBundle() {
          modules = [...this.getModuleIds()].filter((id) => id !== probe);
        }
      }
    ],
    build: {
      write: false,
      lib: { entry: contents === undefined ? entry : probe, formats: ['es'] },
      minify: true
    }
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((item) => item.output);
  return {
    modules,
    text: outputs
      .filter((item) => item.type === 'chunk')
      .map((item) => item.code)
      .join('\n')
  };
}

function judge(result, built = false, logic = false) {
  const bad = result.modules.filter((path) => {
    const absolute = resolve(ROOT, path);
    const local = relative(ROOT, absolute).replaceAll('\\', '/');
    const shared = new Set([
      'src/components/match-up-card/matchUpCard.ts',
      'src/components/match-up-card/matchUpCard.css',
      'src/components/match-up-card/labels.ts'
    ]);
    const allowed = built
      ? local.startsWith('dist/') && !local.includes('courthive-components.')
      : local.startsWith('src/components/operator/') || shared.has(local);
    return !allowed || /\.(stories|test)\.|\/fixtures\./.test(local);
  });
  if (
    /\b(fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker)\b/.test(result.text)
  )
    bad.push('transport/storage code');
  if (/\b(console|Error|DOMException)\b/.test(result.text)) bad.push('error/telemetry sink');
  if (logic && /\b(document|window|HTMLElement)\b/.test(result.text)) bad.push('DOM code in model');
  return bad;
}

function report(name, bad, info = '') {
  console.log(`[operator] ${name}: ${bad.length ? `FAIL\n  ${bad.join('\n  ')}` : `OK ${info}`}`);
  return !bad.length;
}

async function selfTest() {
  let ok = true;
  for (const [name, plant] of Object.entries({
    'factory root': "import 'tods-competition-factory';",
    'schedule adapter and broad CSS': "import '../schedule-page/ui/matchUpCard';",
    'components root renderer': "import '../renderStructure/renderStructure';",
    transport: "fetch('/factory');",
    storage: "localStorage.getItem('tournament');",
    indexedDB: "indexedDB.open('protected-documents');",
    'cache storage': "caches.open('protected-documents');",
    'service worker': "navigator.serviceWorker.register('/worker.js');",
    'personal telemetry': "console.error('Private Person Name');",
    'personal error': "throw new Error('Private Person Name');"
  })) {
    const result = await graph(ENTRY, `export * from './index'; ${plant}`);
    ok = report(`self-test ${name}`, judge(result).length ? [] : ['planted dependency was not detected']) && ok;
  }
  const dom = await graph(MODEL, "export * from './model'; document.createElement('div');");
  ok =
    report(
      'self-test DOM in model',
      judge(dom, false, true).includes('DOM code in model') ? [] : ['DOM plant missed']
    ) && ok;
  const erased = await graph(
    MODEL,
    "export * from './model'; import type { OperatorDrawPresentation } from 'tods-competition-factory/operator-types'; export type { OperatorDrawPresentation };"
  );
  return report('self-test erased contract/real model', judge(erased, false, true)) && ok;
}

async function verify() {
  let ok = true;
  const model = await graph(MODEL);
  ok = report('DOM-free model', judge(model, false, true)) && ok;
  const source = await graph(ENTRY);
  ok = report('source DTO renderer', judge(source), `${source.modules.length} modules`) && ok;
  if (!existsSync(DIST)) return report('built entry', ['dist/operator.mjs missing; run pnpm build']);
  const built = await graph(DIST);
  ok =
    report(
      'built DTO renderer',
      judge(built, true),
      `${Buffer.byteLength(built.text)} B min / ${gzipSync(built.text).length} B gzip`
    ) && ok;
  // Resolve the public package boundary too; an export-map typo must fail even when dist/operator.mjs exists.
  const exported = await graph(ENTRY, "export * from 'courthive-components/operator';");
  ok = report('public operator export', judge(exported, true)) && ok;
  const factory = realpathSync(join(ROOT, 'node_modules/tods-competition-factory'));
  console.log(
    `[operator] factory candidate used for declarations: ${factory.includes('/.pnpm/') ? 'independent installed package' : 'linked checkout'}`
  );
  return ok;
}

async function verifyPacked(file) {
  if (!file) return report('packed operator', ['supply a tarball after --packed']);
  const directory = mkdtempSync(join(tmpdir(), 'operator-pack-'));
  try {
    execFileSync('tar', ['-xzf', resolve(file), '-C', directory]);
    const entry = join(directory, 'package/dist/operator.mjs');
    const module = await import(pathToFileURL(entry).href);
    const code = readFileSync(entry, 'utf8');
    const css = readFileSync(join(directory, 'package/dist/operator.css'), 'utf8');
    const missing = ['renderOperatorMatchRow', 'createOperatorDraw', 'createOperatorMatchListPage'].filter(
      (name) => typeof module[name] !== 'function'
    );
    if (!css.includes('spl-card-side')) missing.push('shared card stylesheet');
    if (/tods-competition-factory|score-entry-state|schedule-page\.css|Simulated services/.test(code))
      missing.push('forbidden packed runtime');
    return report('packed operator imports without DOM and carries isolated CSS', missing);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

try {
  const packed = process.argv.indexOf('--packed');
  process.exitCode = (
    packed >= 0
      ? await verifyPacked(process.argv[packed + 1])
      : process.argv.includes('--self-test')
        ? await selfTest()
        : await verify()
  )
    ? 0
    : 1;
} catch (error) {
  console.error(`[operator] FAIL: ${error.stack}`);
  process.exitCode = 1;
}
