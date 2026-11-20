/** Fixture command/refresh ports only. Scoring remains inside the installed factory state engine. */
import type { EngineOutcome } from 'tods-competition-factory/score-entry-state';
export function createHost() {
  let phase = 'editing';
  let sends = 0;
  let checks = 0;
  let outcome: EngineOutcome | undefined;
  let settle: ((value: unknown) => void) | undefined;
  const listeners = new Set<() => void>();
  const snapshot = () => ({ phase, sends, checks, outcome });
  const notify = () => {
    for (const listener of listeners) listener();
  };
  return {
    snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      listener();
      return () => listeners.delete(listener);
    },
    submit(next: EngineOutcome) {
      if (settle) throw new Error('COMMAND_ALREADY_PENDING');
      outcome = structuredClone(next);
      sends++;
      phase = 'saving';
      const pending = new Promise<unknown>((resolve) => {
        settle = resolve;
      });
      notify();
      return pending;
    },
    accept() {
      phase = 'projection-pending';
      notify();
    },
    refuse() {
      phase = 'refused';
      settle?.({ error: 'COMMAND_REFUSED' });
      settle = undefined;
      notify();
    },
    lose() {
      phase = 'unknown';
      notify();
    },
    recover() {
      checks++;
      phase = 'projection-pending';
      notify();
    },
    publish() {
      phase = 'current';
      settle?.(undefined);
      settle = undefined;
      notify();
    }
  };
}
