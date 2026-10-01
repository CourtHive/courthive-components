/**
 * The one place a `ScoreEntryModel` lives while a card is open.
 *
 * S5 of the state-engine extraction: the card holds the model, and the regions render it. Both need to
 * reach the SAME value, and both replace it — a region when a digit is typed, the card when an ending
 * is chosen — so the model sits in a holder they share rather than in either of them.
 *
 * Deliberately not a subscription system. The card's two seams, `refresh` and `rerender`, already say
 * when something must be redrawn and how much, and they exist to protect the caret: a store that
 * re-rendered on every `set` would replace the input being typed into. So `set` replaces the value and
 * nothing else; whoever set it says what follows, exactly as before.
 *
 * A region built on its own — the behavioural tests do this, and a host that places a card inline may
 * — makes its own store from its params, and the card adopts it. A host that opens the dialog gets one
 * store for everything, which is what makes an approach switch a no-op on the score.
 */

import { createScoreEntryModel } from './scoreEntryModel';

import type { CreateScoreEntryModelParams, ScoreEntryModel } from './scoreEntryModel';

export type ScoreEntryStore = {
  /** The model as it stands. Never mutated; read it again after any transition. */
  get: () => ScoreEntryModel;
  /** Replace the model. The caller says what must be redrawn. */
  set: (next: ScoreEntryModel) => void;
};

export function createScoreEntryStore(params: CreateScoreEntryModelParams = {}): ScoreEntryStore {
  let model = createScoreEntryModel(params);
  return {
    get: () => model,
    set: (next) => {
      model = next;
    }
  };
}
