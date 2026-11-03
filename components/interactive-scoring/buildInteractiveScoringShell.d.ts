import { InteractiveScoringShell, InteractiveScoringShellConfig } from './types';
/**
 * Build a mobile-first full-page interactive scoring shell around a
 * `ScoringEngine` (wrapped by the existing `InlineScoringManager`).
 *
 * This is the courthive-public Phase 2 scoring UI: anonymous,
 * local-only, mobile-first. It does NOT persist state itself —
 * consumers subscribe to `stateChanged` events and handle
 * persistence (IndexedDB in courthive-public's case).
 *
 * Any format the factory ScoringEngine accepts is supported here —
 * tennis (`SET3-S:6/TB7`, `SET5-S:6/TB7`), pickleball (`SET3-S:TB11`),
 * badminton (`SET3-S:TB21`), squash (`SET5-S:TB11`), no-ad and short-set
 * variants. Engine state is passed through unchanged by the UI layer;
 * format-specific score caps, win-by-2, and side-out scoring are handled
 * by the engine. See `src/stories/inlineScoringFormats.stories.ts` for
 * the verified format matrix. INTENNSE bolt scoring lives in epixodic's
 * separate `BoltScoringPage` — not adopted into this shell.
 *
 * The DOM structure:
 * ```
 * .chc-interactive-scoring-shell
 *   .chc-iss-header          (side names + format indicator)
 *   .chc-iss-score-display   (current set scores + game score)
 *   .chc-iss-point-buttons   (big Side 1 / Side 2 point-won buttons)
 *   .chc-iss-control-bar     (undo, reset, complete indicator)
 * ```
 *
 * All styling lives in `interactive-scoring.css` using the shared
 * `--sp-*` / `--chc-*` theme variables.
 */
export declare function buildInteractiveScoringShell(config: InteractiveScoringShellConfig): InteractiveScoringShell;
