/** Story-only app-host simulation. Never exported by components/operator or used as a CFS/query contract. */
import {
  createScoreEntryModel,
  setCell,
  submission,
  clearGate,
  holdsEntry,
  enteredSets,
  toEngineOutcome,
  footerState
} from 'tods-competition-factory/score-entry-state';

// constants and types
import type { CellRef, EngineOutcome, ScoreEntryRulesContext } from 'tods-competition-factory/score-entry-state';
export type PreviewStage = 'editing' | 'saving' | 'projection-pending' | 'current' | 'refused' | 'outcome-unknown';
export type PreviewReceipt = { kind: 'accepted'; revision: number } | { kind: 'refused' } | { kind: 'unknown' };
export type PreviewDocument = { revision: number; matchUpId: string };
export type PreviewPorts = {
  send(command: { commandId: string; matchUpId: string; outcome: EngineOutcome }): Promise<PreviewReceipt>;
  receipt(commandId: string): Promise<PreviewReceipt>;
  read(revision: number): Promise<PreviewDocument>;
  commandId(): string;
};
const UNKNOWN = 'outcome-unknown';
export function createResultPreview(
  ports: PreviewPorts,
  offer: { matchUpId: string; allowed: boolean; rules: ScoreEntryRulesContext }
) {
  let model = createScoreEntryModel({ matchUpFormat: 'SET3-S:6/TB7' });
  let stage: PreviewStage = 'editing';
  let commandId: string | undefined;
  let checking = false;
  let destroyed = false;
  const listeners = new Set<() => void>();
  function snapshot() {
    const view = { model };
    const gate = clearGate({ openedOnRecordedOutcome: false, cleared: false, holdsEntry: holdsEntry(view) });
    const editable = (stage === 'editing' || stage === 'refused') && offer.allowed;
    return {
      model,
      stage,
      checking,
      commandId,
      editable,
      canSave: editable && !footerState(view, gate, offer.rules).submitDisabled
    };
  }
  function notify() {
    for (const listener of listeners) listener();
  }
  async function received(receipt: PreviewReceipt) {
    if (destroyed) return undefined;
    if (receipt.kind !== 'accepted') {
      stage = receipt.kind === 'refused' ? 'refused' : UNKNOWN;
      checking = false;
      notify();
      return undefined;
    }
    stage = 'projection-pending';
    checking = false;
    notify();
    try {
      const document = await ports.read(receipt.revision);
      if (destroyed) return undefined;
      // This fixture models the document revision check, not the as-yet-undelivered producer protocol.
      if (document.matchUpId === offer.matchUpId && document.revision >= receipt.revision) stage = 'current';
      notify();
    } catch {
      if (!destroyed) notify();
    }
  }
  return {
    snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      listener();
      return () => listeners.delete(listener);
    },
    edit(cell: CellRef, value: number | undefined) {
      if (destroyed || !snapshot().editable) return undefined;
      model = setCell(model, cell, value);
      stage = 'editing';
      notify();
    },
    async save() {
      if (destroyed || !snapshot().canSave) return undefined;
      const gate = clearGate({ openedOnRecordedOutcome: false, cleared: false, holdsEntry: holdsEntry({ model }) });
      const report = submission({ model }, gate, offer.rules);
      if (!report) return undefined;
      commandId = ports.commandId();
      stage = 'saving';
      notify();
      try {
        await received(
          await ports.send({
            commandId,
            matchUpId: offer.matchUpId,
            outcome: toEngineOutcome({ ...report, sets: enteredSets(model) })
          })
        );
      } catch {
        if (!destroyed) {
          stage = UNKNOWN;
          notify();
        }
      }
    },
    async recover() {
      if (destroyed || stage !== UNKNOWN || checking || !commandId) return undefined;
      checking = true;
      notify();
      try {
        await received(await ports.receipt(commandId));
      } catch {
        if (!destroyed) {
          checking = false;
          notify();
        }
      }
    },
    destroy() {
      destroyed = true;
      listeners.clear();
    }
  };
}
