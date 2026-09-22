/**
 * BYE matchUps that carry a propagated exit.
 *
 * A walkover can arrive beside a BYE and travel on. The matchUp's own status is then `BYE`, which
 * says nothing about the side that exited — so before this, a TD saw a plain BYE and had no way to
 * know what had passed through it. The badge belongs to the side whose OWN record names an exit.
 *
 * Every matchUp below is MEASURED, not invented: factory `fix/converged-double-exit-cascades-onward`
 * @ `426384fe8`, SINGLE_ELIMINATION 8 with 7 participants, drawPosition 1 replaced with a BYE, then
 * `MAIN|1|2` entered as a DOUBLE_WALKOVER. The consolation rows are the same drive on a
 * FIRST_MATCH_LOSER_CONSOLATION.
 *
 * Rendered from fixtures rather than by driving a tournament, so the cases stay inspectable
 * side by side — including the ones that must stay silent.
 */
import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { compositions } from '../compositions/compositions';
import { expect } from 'storybook/test';
import type { MatchUp } from '../types';

export default {
  title: 'Structure/BYE carrying an exit'
};

const composition = compositions.National ?? Object.values(compositions)[0];

function matchUp(overrides: Record<string, any>): MatchUp {
  return {
    matchUpId: `mu-${Math.random().toString(36).slice(2, 8)}`,
    matchUpType: 'SINGLES',
    structureId: 'struct-1',
    roundNumber: 2,
    roundPosition: 1,
    finishingRound: 2,
    sides: [{ sideNumber: 1, bye: true }, { sideNumber: 2 }],
    score: { scoreStringSide1: '', scoreStringSide2: '' },
    ...overrides
  } as unknown as MatchUp;
}

const CASES: { label: string; note: string; matchUp: MatchUp }[] = [
  {
    label: 'MAIN|2|1 — BYE advanced, walkover arrived beside it',
    note: 'side 1 carries BYE → BYE and stays silent; side 2 carries the exit and shows WO',
    matchUp: matchUp({
      matchUpStatus: 'BYE',
      matchUpStatusCodes: [
        { previousMatchUpStatus: 'BYE', matchUpStatus: 'BYE', sideNumber: 1 },
        { previousMatchUpStatus: 'DOUBLE_WALKOVER', matchUpStatus: 'WALKOVER', sideNumber: 2 }
      ],
      sideExitProvenance: {
        1: { matchUpStatus: 'BYE', previousMatchUpStatus: 'BYE', sourceMatchUpId: 'm-1-1' },
        2: { matchUpStatus: 'WALKOVER', previousMatchUpStatus: 'DOUBLE_WALKOVER', sourceMatchUpId: 'm-1-2' }
      }
    })
  },
  {
    label: 'CONSOLATION|1|1 — the other side is a reserved slot',
    note: 'a bare { sideNumber } code names no status: a reserved slot is not an exit',
    matchUp: matchUp({
      matchUpStatus: 'BYE',
      matchUpStatusCodes: [
        { sideNumber: 1 },
        { previousMatchUpStatus: 'DOUBLE_WALKOVER', matchUpStatus: 'WALKOVER', sideNumber: 2 }
      ],
      sideExitProvenance: {
        2: { matchUpStatus: 'WALKOVER', previousMatchUpStatus: 'DOUBLE_WALKOVER', sourceMatchUpId: 'm-1-2' }
      }
    })
  },
  {
    label: 'A retirement that travelled the same way',
    note: 'the pill reads the exit the side carries, so RET renders as RET',
    matchUp: matchUp({
      matchUpStatus: 'BYE',
      sideExitProvenance: {
        2: { matchUpStatus: 'RETIRED', previousMatchUpStatus: 'RETIRED', sourceMatchUpId: 'm-1-2' }
      }
    })
  },
  {
    label: 'CONTROL — an ordinary BYE',
    note: 'nothing propagated here: no badge on either side, exactly as before',
    matchUp: matchUp({
      matchUpStatus: 'BYE',
      sides: [
        { sideNumber: 1, participant: { participantId: 'p1', participantName: 'Advancing Player' } },
        { sideNumber: 2, bye: true }
      ]
    })
  },
  {
    label: 'CONTROL — two BYEs converging',
    note: 'both sides carry BYE → BYE provenance, which is not an exit: still silent',
    matchUp: matchUp({
      matchUpStatus: 'BYE',
      sideExitProvenance: {
        1: { matchUpStatus: 'BYE', previousMatchUpStatus: 'BYE', sourceMatchUpId: 'm-1-1' },
        2: { matchUpStatus: 'BYE', previousMatchUpStatus: 'BYE', sourceMatchUpId: 'm-1-3' }
      }
    })
  }
];

export const ByeCarryingExit = {
  render: () => {
    const outer = document.createElement('div');
    outer.style.cssText = 'display:flex; flex-direction:column; gap:18px; padding:12px;';

    for (const { label, note, matchUp: mu } of CASES) {
      const block = document.createElement('div');

      const heading = document.createElement('div');
      heading.style.cssText = 'font-weight:600; margin-bottom:2px;';
      heading.textContent = label;

      const subtitle = document.createElement('div');
      subtitle.style.cssText = 'font-size:0.8rem; opacity:0.7; margin-bottom:6px;';
      subtitle.textContent = note;

      const themed = document.createElement('div');
      themed.className = `chc-container ${composition.theme}`;
      themed.style.cssText = 'height:auto; overflow:visible;';
      themed.appendChild(renderMatchUp({ matchUp: mu, composition }));

      block.append(heading, subtitle, themed);
      outer.appendChild(block);
    }

    return outer;
  },

  // Local-only evidence: `test-storybook` is in no workflow. Asserts the whole point of the story —
  // a badge beside the side that carries an exit, and silence everywhere else.
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const blocks = canvasElement.querySelectorAll('.chc-container');
    await expect(blocks).toHaveLength(CASES.length);

    const badgedSides = (block: Element) =>
      Array.from(block.querySelectorAll('.chc-side-container'))
        .filter((side) => side.querySelector('.chc-pill'))
        .map((side) => Number(side.getAttribute('sidenumber')));

    // the three carrying an exit badge side 2 alone; the two controls stay silent
    await expect(badgedSides(blocks[0])).toEqual([2]);
    await expect(badgedSides(blocks[1])).toEqual([2]);
    await expect(badgedSides(blocks[2])).toEqual([2]);
    await expect(badgedSides(blocks[3])).toEqual([]);
    await expect(badgedSides(blocks[4])).toEqual([]);

    // and the pill names the exit the side carries, never the matchUp's own BYE
    await expect(blocks[0].querySelector('.chc-pill')?.textContent?.trim()).toBe('WO');
    await expect(blocks[2].querySelector('.chc-pill')?.textContent?.trim()).toBe('RET');
  }
};
