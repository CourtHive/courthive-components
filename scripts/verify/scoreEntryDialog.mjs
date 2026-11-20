/** Qualify the actual mobile dialog and format picker, not a substitute scoring form. */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const probe = resolve(root, 'src/__score_dialog_guard__.ts');
const allowedFactory =
  /^(scoreEntryState|constants|helpers\/matchUpFormatCode|query\/matchUp|scoring\/(kernel|analysis|views))\//;

async function graph(plant = '') {
  let modules = [];
  const result = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [
      {
        name: 'score-dialog-graph',
        resolveId: (id) => (id === probe ? probe : undefined),
        load: (id) =>
          id === probe
            ? `export { openScoreEntryDialog } from './components/scoring/scoreEntryDialog'; ${plant}`
            : undefined,
        generateBundle() {
          modules = [...this.getModuleIds()];
        }
      }
    ],
    build: { write: false, minify: true, lib: { entry: probe, formats: ['es'] } }
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((item) => item.output);
  const js = outputs
    .filter((item) => item.type === 'chunk')
    .map((item) => item.code)
    .join('\n');
  const bad = modules.filter((id) => {
    if (!id.includes('tods-competition-factory')) return false;
    const path = id.split('/dist/esm/')[1];
    return !path || (!allowedFactory.test(path) && !/^tools\/(numeric|objects|ensureInt)\./.test(path));
  });
  return { bad, bytes: Buffer.byteLength(js), gzip: gzipSync(js).length };
}

const clean = await graph();
if (clean.bad.length)
  throw new Error(
    `Score dialog reaches forbidden factory modules:\n${clean.bad.slice(0, 3).join('\n')} (${clean.bad.length} modules)`
  );
console.log(`[score dialog] canonical dialog + picker: ${clean.bytes} JS bytes / ${clean.gzip} gzip; no engine/root`);
for (const [label, plant] of Object.entries({
  root: "export { tournamentEngine } from 'tods-competition-factory';",
  governors: "export * from 'tods-competition-factory/governors';"
})) {
  if (!(await graph(plant)).bad.length) throw new Error(`Score dialog guard missed planted ${label}`);
  console.log(`[score dialog] detected deliberately planted ${label} import`);
}
