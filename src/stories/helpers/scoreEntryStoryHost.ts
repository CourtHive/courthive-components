/**
 * The host every score-entry story shares: a live format chip, and a card that reopens on what it just
 * submitted.
 *
 * CA, 2026-09-28, gave two instructions that apply to EVERY story rather than to any one of them:
 *
 *   - *"the 'format chip' should be active for all Score Entry Card stories, and changing the
 *     matchUpFormat should take effect (at present any change of matchUpFormat should clear the
 *     score... but we'll do something interesting later)."*
 *   - *"All of the stories should allow me to Submit and then re-open on the score I just submitted."*
 *
 * Written once, here, for the same reason `openScoreEntryDialog` was lifted out of the stories: wiring
 * that lives in a story means the thing being reviewed in Storybook is not the thing a host would get,
 * and nineteen copies of "turn an outcome back into a record" is nineteen chances to get the ONE
 * inversion wrong — a stored matchUp names the WINNER, while the card records the side an ending
 * HAPPENED TO.
 *
 * ── What a submitted outcome has to become ──
 *
 * `asRecord` is the mapping a real host performs, and it is the part worth reading. The reason code has
 * three homes and `recordedStatusCode` reads them in order, so a record written to only one of them
 * round-trips for some endings and silently loses the reason for the rest:
 *
 *   - a single exit  → `sideStatusCodes[3 - winningSide]`, the side that did not win;
 *   - a double exit  → both sides, because neither is distinguished and side 1 is what is read;
 *   - no winner at all → `matchUpStatusCode`, the MATCH's own, because there is no side to attach to.
 */
import { createDynamicSetsRegion } from '../../components/scoring/regions/dynamicSetsRegion';
import { createFreeScoreRegion } from '../../components/scoring/regions/freeScoreRegion';
import { createScoreEntryStore } from '../../components/scoring/logic/scoreEntryStore';
import { getMatchUpFormatModal } from '../../components/matchUpFormat/matchUpFormat';
import { createDialPadRegion } from '../../components/scoring/regions/dialPadRegion';
import { isDoubleExitStatus } from '../../components/scoring/logic/irregularEnding';
import { renderScoreEntryCard } from '../../components/scoring/scoreEntryCard';
import { switchApproach } from '../../components/scoring/logic/scoreEntryModel';

import type { ScoreEntryStore } from '../../components/scoring/logic/scoreEntryStore';
import type { StatusCodeGroups } from '../../components/scoring/logic/statusCodes';

export type StoryApproach = 'dynamicSets' | 'freeScore' | 'dialPad';

/** The order the switcher's menu lists them, the same as the dialog's. */
export const ALL_APPROACHES: StoryApproach[] = ['dynamicSets', 'freeScore', 'dialPad'];

export const APPROACH_LABELS: Record<StoryApproach, string> = {
  dynamicSets: 'Dynamic Sets',
  freeScore: 'Free Score',
  dialPad: 'Dial Pad'
};

export type ScoreEntryCardHostParams = {
  sides: any;
  matchUpFormat: string;
  approach?: StoryApproach;
  context?: string;
  statusCodeGroups?: StatusCodeGroups;
  /** The score to open on. Superseded by whatever the card last submitted. */
  sets?: any[];
  /** A recorded outcome to open on, as the factory stores one. */
  matchUp?: any;
  /** Somewhere to say what happened, so a director can watch the round trip. */
  log?: (line: string) => void;
  /** Anything else the card takes — a story overrides only what it is about. */
  cardOver?: Record<string, any>;
  /**
   * The format picker. Defaults to this package's real one.
   *
   * Injectable for the same reason `openScoreEntryDialog` makes it injectable: the real picker is a
   * second modal with its own state, and a story that wants to assert what a format CHANGE does cannot
   * get there by driving another dialog's internals. Without this the only assertable fact was that the
   * picker opened — which is true whether or not the change takes effect, and was therefore no evidence
   * of the behaviour CA actually asked for.
   */
  openFormatPicker?: (params: { existingMatchUpFormat: string; callback: (matchUpFormat: string) => void }) => void;
};

/**
 * A card that rebuilds itself in place.
 *
 * Returns the container rather than the card: the card element is REPLACED on every submit and on every
 * format change, so a story that held the card element would be holding a detached node the moment the
 * operator used it.
 */
export function scoreEntryCardHost(params: ScoreEntryCardHostParams): HTMLElement {
  const container = document.createElement('div');
  container.dataset.scoreEntryHost = 'true';

  let matchUpFormat = params.matchUpFormat;
  let record = params.matchUp;
  let sets = params.sets ?? params.matchUp?.score?.sets;
  let approach: StoryApproach = params.approach ?? 'dynamicSets';

  build();
  return container;

  function build(): void {
    // ONE store for the card and every region, as the dialog has — which is what makes the approach
    // switcher a change of renderer and not of score. The recorded outcome seeds the ending, so a card
    // reopened after a submit shows the ending it holds.
    const store = createScoreEntryStore({ matchUpFormat, sets, matchUp: record, approach });
    const hooks = {
      onChange: () => card.refresh(),
      onStructureChange: () => card.rerender()
    };
    let region: any = createRegion(approach, store, hooks);

    const card = renderScoreEntryCard({
      sides: params.sides,
      matchUpFormat,
      context: params.context,
      statusCodeGroups: params.statusCodeGroups,
      approachLabel: APPROACH_LABELS[approach],
      // CA, 2026-11-07: the switcher was a button with no handler in every Card story — the host passed
      // a label and nothing to choose from. The three approaches are offered as the dialog offers them,
      // and a choice rebuilds the region over the same store, so the typed score comes across.
      approaches: ALL_APPROACHES.map((key) => ({ key, label: APPROACH_LABELS[key] })),
      onSelectApproach: (key: string) => {
        const next = key as StoryApproach;
        store.set(switchApproach(store.get(), next));
        approach = next;
        region = createRegion(approach, store, hooks);
        card.update({ region, approachLabel: APPROACH_LABELS[approach] });
        params.log?.(`approach → ${next}`);
      },
      region,
      store,
      // CA: the chip is live in EVERY story. It opens this package's real picker, and what comes back
      // rebuilds the region under the new format.
      onEditFormat: () =>
        (params.openFormatPicker ?? getMatchUpFormatModal)({
          existingMatchUpFormat: matchUpFormat,
          callback: (chosen: string) => {
            if (chosen) changeFormat(chosen);
          }
        }),
      onSubmit: (outcome: any) => {
        const submitted = region.getSets?.() ?? [];
        params.log?.(`submit → ${JSON.stringify({ ...outcome, sets: gamesPerSet(submitted) })}`);
        // Straight back in as a record — the shape a host would have stored — so the story reopens on
        // exactly what it produced rather than on what it started with.
        record = asRecord(outcome, submitted, matchUpFormat);
        sets = submitted;
        build();
        params.log?.('reopened on the submitted outcome');
      },
      ...params.cardOver
    });

    container.replaceChildren(card.element);
  }

  /**
   * A format change CLEARS the score, on CA's instruction.
   *
   * The recorded ENDING goes with it: a score entered under one format and an ending recorded against a
   * row are one outcome, and keeping half of it would leave the card asserting a walkover for a match
   * whose score it has just discarded.
   */
  function changeFormat(chosen: string): void {
    matchUpFormat = chosen;
    sets = undefined;
    record = undefined;
    params.log?.(`format → ${chosen} (score cleared)`);
    build();
  }
}

/**
 * The region for an approach, rendering the host's one store.
 *
 * Free Score renders the model's own score line, so all three open quoting the same score — it used to
 * be seeded with text of its own, which a switch would then have had to translate.
 */
export function createRegion(
  approach: StoryApproach,
  store: ScoreEntryStore,
  hooks: { onChange: () => void; onStructureChange: () => void }
): any {
  if (approach === 'freeScore') return createFreeScoreRegion({ store, onChange: hooks.onChange });
  if (approach === 'dialPad') return createDialPadRegion({ store, onChange: hooks.onChange });
  return createDynamicSetsRegion({ store, onChange: hooks.onChange, onStructureChange: hooks.onStructureChange });
}

/**
 * What a host would STORE for an outcome the card reported.
 *
 * See the header for why the reason code lands where it does. `winningSide` is written as reported: the
 * card gives the ending's winner where there is one and the score's otherwise, and both are real
 * answers a record needs.
 */
export function asRecord(outcome: any, sets: any[], matchUpFormat: string): Record<string, any> {
  const { matchUpStatus, winningSide, reasonCode } = outcome;

  return {
    matchUpFormat,
    matchUpStatus,
    winningSide,
    score: { sets },
    ...reasonHome(matchUpStatus, winningSide, reasonCode)
  };
}

/**
 * Where a reason code is STORED, which is decided by the ending rather than by whether a winner exists.
 *
 * Exactly one home per ending, matching the order `recordedStatusCode` reads them in. Writing to more
 * than one would look like belt and braces and is worse than it sounds: a second copy makes the first
 * unfalsifiable, so a mapping that put the reason on the wrong side would still round-trip and no test
 * could tell. That is not hypothetical — this function wrote `matchUpStatusCode` for a double exit as
 * well as both sides, and reverting the both-sides half changed nothing anywhere.
 */
function reasonHome(matchUpStatus: string | undefined, winningSide: number | undefined, reasonCode?: string) {
  if (!reasonCode) return {};

  // A double exit distinguishes no side, so the code goes on BOTH and side 1 is what gets read.
  if (isDoubleExitStatus(matchUpStatus)) return { sideStatusCodes: { 1: reasonCode, 2: reasonCode } };

  // A single exit attributes to the side that did NOT win.
  if (winningSide) return { sideStatusCodes: { [3 - winningSide]: reasonCode } };

  // An ending that resolves nobody — ABANDONED, CANCELLED, INCOMPLETE — has no side to attach to.
  return { matchUpStatusCode: reasonCode };
}

/** `6-4` per set, so a log reads as a score rather than as a wall of set objects. */
export function gamesPerSet(sets?: any[]): string[] {
  return (sets ?? []).map((set) => `${set.side1Score ?? ''}-${set.side2Score ?? ''}`);
}

/** The log panel every score-entry story shows beneath its control. */
export function storyLog(id: string): { element: HTMLElement; append: (line: string) => void } {
  const element = document.createElement('pre');
  element.id = id;
  element.style.cssText =
    'margin:0; padding:8px; font-size:0.75rem; min-height:2.5em; white-space:pre-wrap; align-self:stretch;' +
    'background: var(--chc-bg-secondary); color: var(--chc-text-primary);' +
    'border:1px solid var(--chc-border-primary); border-radius:4px;';

  return {
    element,
    append: (line: string) => {
      element.textContent = element.textContent ? `${element.textContent}\n${line}` : line;
    }
  };
}
