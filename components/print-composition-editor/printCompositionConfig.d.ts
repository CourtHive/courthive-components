import { PrintCompositionConfig } from './printCompositionEditorTypes';
export declare const DEFAULT_PRINT_CONFIG: PrintCompositionConfig;
/**
 * The defaults overlaid, block by block, with a host config. Both are copied first: the editor writes into
 * the result, and a nested host block (`content.draw`) shared with it would be edited in the host's hands.
 */
export declare function resolvePrintConfig(host?: PrintCompositionConfig): PrintCompositionConfig;
/** The block at `key`, created empty when missing. */
export declare function ensureBlock<T extends object, K extends keyof T>(parent: T, key: K): NonNullable<T[K]>;
/** Write one field, creating the blocks on its path: `['content', 'draw', 'showByes']`. */
export declare function setPrintField(state: PrintCompositionConfig, path: readonly string[], value: unknown): void;
/** A detached copy: what the editor hands out, so a host's edits never reach its state. */
export declare function printConfigSnapshot(config: PrintCompositionConfig): PrintCompositionConfig;
