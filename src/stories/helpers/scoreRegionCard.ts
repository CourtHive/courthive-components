/**
 * One score region in the real card, for the region test stories.
 *
 * `scoreEntryCardHost` is the host a consumer would write — a shared store, a format chip, a card that
 * rebuilds on Submit. The region stories need the opposite: one card that stays put while it is typed
 * into, built straight from a region's own params (Smart off, an `onSubmit` spy), as the unit suites that
 * these stories replace built it.
 */
import { createDynamicSetsRegion } from '../../components/scoring/regions/dynamicSetsRegion';
import { createFreeScoreRegion } from '../../components/scoring/regions/freeScoreRegion';
import { createDialPadRegion } from '../../components/scoring/regions/dialPadRegion';
import { renderScoreEntryCard } from '../../components/scoring/scoreEntryCard';

export const SIDES: [{ participantName: string }, { participantName: string }] = [
  { participantName: 'Rosalind Lem' },
  { participantName: 'Derrick Ellul' }
];

export type RegionKind = 'dynamicSets' | 'freeScore' | 'dialPad';

export type RegionCardParams = {
  matchUpFormat?: string;
  sets?: any[];
  /** Dynamic Sets only. */
  smartComplements?: boolean;
  /** Free Score only. */
  initialText?: string;
  onSubmit?: (outcome: any) => void;
  /** The frame's width; the card fills it. */
  width?: number;
};

export function regionCard(kind: RegionKind, params: RegionCardParams = {}): HTMLElement {
  const matchUpFormat = params.matchUpFormat ?? 'SET3-S:6/TB7';
  const hooks = { onChange: () => card.refresh(), onStructureChange: () => card.rerender() };
  const region =
    kind === 'freeScore'
      ? createFreeScoreRegion({ matchUpFormat, initialText: params.initialText, onChange: hooks.onChange })
      : kind === 'dialPad'
        ? createDialPadRegion({ matchUpFormat, sets: params.sets, onChange: hooks.onChange })
        : createDynamicSetsRegion({
            matchUpFormat,
            sideNames: [SIDES[0].participantName, SIDES[1].participantName],
            sets: params.sets,
            smartComplements: params.smartComplements,
            ...hooks
          });
  const card = renderScoreEntryCard({ sides: SIDES, matchUpFormat, region, onSubmit: params.onSubmit });

  const frame = document.createElement('div');
  frame.style.cssText = `width:100%;max-width:${params.width ?? 720}px;padding:16px;box-sizing:border-box`;
  frame.append(card.element);
  return frame;
}

/** The one element a selector names inside `root`, or a loud failure — a silent miss passes what follows. */
export function one<T extends Element = HTMLElement>(root: Element | Document, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`nothing matched ${selector}`);
  return found;
}
