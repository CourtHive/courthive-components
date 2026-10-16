/** Emit only the feature declaration graphs, without touching the root declaration bundle. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const parsed = ts.getParsedCommandLineOfConfigFile(
  join(root, 'tsconfig.json'),
  {
    noEmit: false,
    declaration: true,
    emitDeclarationOnly: true,
    outDir: join(root, 'dist/features-types'),
    rootDir: join(root, 'src/components')
  },
  {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    }
  }
);
const program = ts.createProgram({
  rootNames: [
    join(root, 'src/components/courts/index.ts'),
    join(root, 'src/components/segmentedBar/index.ts'),
    join(root, 'src/css.d.ts')
  ],
  options: parsed.options
});
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length)
  throw new Error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: (name) => name,
      getNewLine: () => '\n'
    })
  );
program.emit(undefined, (name, text) => {
  mkdirSync(dirname(name), { recursive: true });
  // A declaration has no runtime stylesheet side effects. Keep CSS in the explicit features.css export.
  writeFileSync(name, text.replace(/^import ['"][^'"]+\.css['"];?\r?\n/gm, ''));
});
