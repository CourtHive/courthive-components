/** Emit the scoring entry's complete declaration graph, preserving paths outside components/. */
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
    outDir: join(root, 'dist/score-entry-types'),
    rootDir: join(root, 'src')
  },
  {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    }
  }
);
const program = ts.createProgram({
  rootNames: [join(root, 'src/components/scoring/index.ts'), join(root, 'src/css.d.ts')],
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
  writeFileSync(name, text.replace(/^import ['"][^'"]+\.css['"];?\r?\n/gm, ''));
});
