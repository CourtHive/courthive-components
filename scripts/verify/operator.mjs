/** The first read-only operator entry renders DTOs only. No factory runtime, root components, transport or storage. */
import { dirname, join, relative, resolve } from 'node:path';
import { existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
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
    const allowed = built
      ? local.startsWith('dist/') && !local.includes('courthive-components.')
      : local.startsWith('src/components/operator/');
    return !allowed || /\.(stories|test)\.|\/fixtures\./.test(local);
  });
  if (/\b(fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\b/.test(result.text))
    bad.push('transport/storage code');
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
    'components root renderer': "import '../renderStructure/renderStructure';",
    transport: "fetch('/factory');",
    storage: "console.log(localStorage.getItem('tournament'));"
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

try {
  process.exitCode = (process.argv.includes('--self-test') ? await selfTest() : await verify()) ? 0 : 1;
} catch (error) {
  console.error(`[operator] FAIL: ${error.stack}`);
  process.exitCode = 1;
}
