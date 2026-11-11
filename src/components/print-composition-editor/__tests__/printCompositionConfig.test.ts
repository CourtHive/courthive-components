/**
 * The print composition editor's config rules, in node. Its form (sections, read-only, schedule fields, the
 * placeholder note, onChange and onSave wiring) is asserted in Chromium by
 * `src/stories/PrintCompositionEditorTests.stories.ts`.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRINT_CONFIG,
  printConfigSnapshot,
  resolvePrintConfig,
  setPrintField
} from '../printCompositionConfig';

// constants and types
import type { PrintCompositionConfig } from '../printCompositionEditorTypes';

describe('resolvePrintConfig', () => {
  it('fills every block from the defaults when the host gives nothing', () => {
    expect(resolvePrintConfig()).toEqual({ name: undefined, ...DEFAULT_PRINT_CONFIG });
  });

  it('seeds from the host config block by block, keeping defaults the host did not set', () => {
    const resolved = resolvePrintConfig({
      name: 'Club',
      header: { layout: 'minimal', tournamentName: 'My Event' },
      page: { margins: { top: 20 } as any }
    });
    expect(resolved.name).toBe('Club');
    expect(resolved.header).toEqual({ layout: 'minimal', tournamentName: 'My Event' });
    expect(resolved.page).toEqual({
      pageSize: 'a4',
      orientation: 'auto',
      margins: { top: 20, right: 10, bottom: 15, left: 10 }
    });
    expect(resolved.footer).toEqual(DEFAULT_PRINT_CONFIG.footer);
  });

  it('never shares a block with the host config or the defaults', () => {
    const host: PrintCompositionConfig = { content: { draw: { showByes: false } }, header: { tournamentName: 'X' } };
    const resolved = resolvePrintConfig(host);
    setPrintField(resolved, ['content', 'draw', 'showByes'], true);
    setPrintField(resolved, ['header', 'tournamentName'], 'edited');
    setPrintField(resolved, ['page', 'margins', 'top'], 1);
    expect(host).toEqual({ content: { draw: { showByes: false } }, header: { tournamentName: 'X' } });
    expect(DEFAULT_PRINT_CONFIG.page?.margins?.top).toBe(15);
  });
});

describe('setPrintField', () => {
  it('creates the blocks on the path', () => {
    const state: PrintCompositionConfig = {};
    setPrintField(state, ['content', 'schedule', 'cellStyle'], 'compact');
    setPrintField(state, ['page', 'pageSize'], 'letter');
    expect(state).toEqual({ content: { schedule: { cellStyle: 'compact' } }, page: { pageSize: 'letter' } });
  });

  it('writes into an existing block without dropping its other fields', () => {
    const state = resolvePrintConfig();
    setPrintField(state, ['footer', 'showTimestamp'], false);
    expect(state.footer).toEqual({ layout: 'standard', showTimestamp: false, showPageNumbers: true });
  });
});

describe('printConfigSnapshot', () => {
  it('is a deep copy: editing it does not reach the editor state', () => {
    const state = resolvePrintConfig({ header: { tournamentName: 'X' } });
    const snapshot = printConfigSnapshot(state);
    snapshot.header!.tournamentName = 'mutated';
    snapshot.page!.margins!.top = 0;
    expect(state.header?.tournamentName).toBe('X');
    expect(state.page?.margins?.top).toBe(15);
    expect(snapshot).not.toBe(state);
  });
});
