import { createResultPreview } from './result.stories.model';
import { describe, expect, it } from 'vitest';

// constants and types
import type { PreviewPorts, PreviewReceipt, PreviewDocument } from './result.stories.model';
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function fixture(overrides: Partial<PreviewPorts> = {}, allowed = true) {
  let sends = 0;
  const ids: string[] = [];
  const ports: PreviewPorts = {
    commandId: () => 'command-1',
    send: async () => {
      sends++;
      return { kind: 'accepted', revision: 2 };
    },
    read: async () => ({ revision: 2, matchUpId: 'match-1' }),
    receipt: async (id) => {
      ids.push(id);
      return { kind: 'accepted', revision: 2 };
    },
    ...overrides
  };
  const controller = createResultPreview(ports, {
    matchUpId: 'match-1',
    allowed,
    rules: { disabledMatchUpStatuses: [] }
  });
  function complete() {
    for (const [setIndex, a, b] of [
      [0, 6, 4],
      [1, 6, 3]
    ]) {
      controller.edit({ setIndex, side: 1, kind: 'games' }, a);
      controller.edit({ setIndex, side: 2, kind: 'games' }, b);
    }
  }
  return { controller, complete, sends: () => sends, ids };
}
describe('story-only result host, using the released scoring state engine', () => {
  it('uses canonical validation and waits for the updated document after acceptance', async () => {
    const read = deferred<PreviewDocument>();
    const { controller, complete } = fixture({ read: () => read.promise });
    expect(controller.snapshot().canSave).toBe(false);
    complete();
    expect(controller.snapshot().canSave).toBe(true);
    const saved = controller.save();
    await Promise.resolve();
    expect(controller.snapshot().stage).toBe('projection-pending');
    expect(controller.snapshot().canSave).toBe(false);
    read.resolve({ revision: 1, matchUpId: 'match-1' });
    await saved;
    expect(controller.snapshot().stage).toBe('projection-pending');
  });
  it('unknown outcome recovery checks the same command and never submits it twice', async () => {
    let sends = 0;
    const { controller, complete, ids } = fixture({
      send: async () => {
        sends++;
        throw new Error('network lost');
      }
    });
    complete();
    await controller.save();
    expect(controller.snapshot().stage).toBe('outcome-unknown');
    await controller.save();
    expect(sends).toBe(1);
    await controller.recover();
    expect(ids).toEqual(['command-1']);
    expect(controller.snapshot().stage).toBe('current');
  });
  it('refusal retains score and returns to an editable state', async () => {
    const { controller, complete } = fixture({ send: async () => ({ kind: 'refused' }) });
    complete();
    const sets = controller.snapshot().model.sets;
    await controller.save();
    expect(controller.snapshot().stage).toBe('refused');
    expect(controller.snapshot().model.sets).toBe(sets);
    expect(controller.snapshot().canSave).toBe(true);
  });
  it('no supplied offer means the preview cannot save, even a valid score', async () => {
    const { controller, complete, sends } = fixture({}, false);
    complete();
    await controller.save();
    expect(controller.snapshot().canSave).toBe(false);
    expect(sends()).toBe(0);
  });
  it('a late acknowledgment cannot revive a disposed host', async () => {
    const receipt = deferred<PreviewReceipt>();
    const { controller, complete } = fixture({ send: () => receipt.promise });
    complete();
    const saved = controller.save();
    controller.destroy();
    receipt.resolve({ kind: 'accepted', revision: 2 });
    await saved;
    expect(controller.snapshot().stage).toBe('saving');
  });
});
