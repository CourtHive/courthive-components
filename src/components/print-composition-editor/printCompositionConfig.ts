/**
 * The print composition editor's config rules, free of the DOM: defaults, seeding from a host config,
 * field writes and the snapshot handed to `onChange`, `onSave` and `getConfig`.
 */
import type { PrintCompositionConfig } from './printCompositionEditorTypes';

export const DEFAULT_PRINT_CONFIG: PrintCompositionConfig = {
  page: {
    pageSize: 'a4',
    orientation: 'auto',
    margins: { top: 15, right: 10, bottom: 15, left: 10 }
  },
  header: { layout: 'itf', tournamentName: '' },
  footer: { layout: 'standard', showTimestamp: true, showPageNumbers: true },
  content: {}
};

/**
 * The defaults overlaid, block by block, with a host config. Both are copied first: the editor writes into
 * the result, and a nested host block (`content.draw`) shared with it would be edited in the host's hands.
 */
export function resolvePrintConfig(host: PrintCompositionConfig = {}): PrintCompositionConfig {
  const base = structuredClone(DEFAULT_PRINT_CONFIG);
  const overlay = structuredClone(host);
  return {
    name: overlay.name ?? base.name,
    page: { ...base.page, ...overlay.page, margins: { ...base.page?.margins, ...overlay.page?.margins } },
    header: { ...base.header, ...overlay.header },
    footer: { ...base.footer, ...overlay.footer },
    content: { ...base.content, ...overlay.content }
  };
}

/** The block at `key`, created empty when missing. */
export function ensureBlock<T extends object, K extends keyof T>(parent: T, key: K): NonNullable<T[K]> {
  if (parent[key] === undefined || parent[key] === null) {
    (parent as any)[key] = {} as any;
  }
  return parent[key] as NonNullable<T[K]>;
}

/** Write one field, creating the blocks on its path: `['content', 'draw', 'showByes']`. */
export function setPrintField(state: PrintCompositionConfig, path: readonly string[], value: unknown): void {
  let node: any = state;
  for (const key of path.slice(0, -1)) node = ensureBlock(node, key);
  node[path.at(-1)!] = value;
}

/** A detached copy: what the editor hands out, so a host's edits never reach its state. */
export function printConfigSnapshot(config: PrintCompositionConfig): PrintCompositionConfig {
  return structuredClone(config);
}
