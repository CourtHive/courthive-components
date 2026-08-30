#!/usr/bin/env node
// Prepares a checkout for a CI install.
//
// Local development links sibling CourtHive repos with `link:../<repo>` values,
// conventionally placed in package.json's `pnpm.overrides` and in the
// `overrides:` block of pnpm-workspace.yaml. CI has no siblings on disk, so
// those entries are stripped here and the real npm versions resolve instead.
//
// It also refuses to continue when a `link:` value has leaked into a dependency
// table (dependencies / devDependencies / peerDependencies). Those must name
// real published versions — v3.4.1 shipped with one and broke every consumer.
//
// Both the release workflow and the PR workflow call this, so the two can never
// drift into preparing the tree differently.
//
// Usage: node scripts/ci-prepare.mjs [--drop-lockfile]

import fs from 'node:fs';

const dropLockfile = process.argv.includes('--drop-lockfile');
const LINK = 'link:';

function stripManifestOverrides() {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const stripped = [];

  if (pkg.pnpm?.overrides) {
    for (const [name, value] of Object.entries(pkg.pnpm.overrides)) {
      if (typeof value === 'string' && value.startsWith(LINK)) {
        delete pkg.pnpm.overrides[name];
        stripped.push(`package.json pnpm.overrides.${name}`);
      }
    }
    if (!Object.keys(pkg.pnpm.overrides).length) delete pkg.pnpm.overrides;
    if (pkg.pnpm && !Object.keys(pkg.pnpm).length) delete pkg.pnpm;
  }

  const offenders = [];
  for (const table of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const [name, value] of Object.entries(pkg[table] ?? {})) {
      if (typeof value === 'string' && value.startsWith(LINK)) offenders.push(`${table}.${name} = ${value}`);
    }
  }
  if (offenders.length) {
    console.error('[ci-prepare] Refusing to continue: link: values found in dependency tables.');
    console.error('[ci-prepare] Pin these to real npm versions and keep local linkage in overrides:');
    for (const offender of offenders) console.error(`  - ${offender}`);
    process.exit(1);
  }

  fs.writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
  return stripped;
}

function stripWorkspaceOverrides() {
  if (!fs.existsSync('pnpm-workspace.yaml')) return [];
  const yaml = fs.readFileSync('pnpm-workspace.yaml', 'utf8');
  const block = /^overrides:\n(  [^\n]*\n)*/m.exec(yaml);
  if (!block) return [];

  // Only the `link:` lines go. The rest of the block carries version pins and
  // security overrides that CI needs just as much as a developer does — the
  // earlier workflow deleted the whole block and quietly released without them.
  const lines = block[0].split('\n');
  const kept = lines.filter((line) => !line.includes(LINK));
  const stripped = lines
    .filter((line) => line.includes(LINK))
    .map((line) => `pnpm-workspace.yaml overrides: ${line.trim()}`);
  if (!stripped.length) return [];

  const remaining = kept.filter((line) => line.trim() && line !== 'overrides:');
  const replacement = remaining.length ? kept.join('\n') : '';
  fs.writeFileSync('pnpm-workspace.yaml', yaml.replace(block[0], replacement));
  return stripped;
}

const stripped = [...stripManifestOverrides(), ...stripWorkspaceOverrides()];
for (const entry of stripped) console.log(`[ci-prepare] stripped ${entry}`);
if (!stripped.length) console.log('[ci-prepare] no link: overrides to strip');

if (dropLockfile) {
  fs.rmSync('pnpm-lock.yaml', { force: true });
  console.log('[ci-prepare] removed pnpm-lock.yaml — dependencies will resolve to latest matching versions');
}
