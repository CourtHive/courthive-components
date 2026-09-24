/**
 * A seed awarded on something other than ranking.
 *
 * Some governing bodies permit seeds ABOVE the count their policy allows — a protected ranking
 * seeded ALONGSIDE the normal seeds rather than in place of one of them. That seed displaced
 * nobody, and it is the one somebody will later ask about. `Side.seedingBasis` (factory 7.1+)
 * carries the ground it was awarded on.
 *
 * ## Why the bracket is marked here and the printed bracket is not
 *
 * pdf-factory footnotes its **seedings table** and deliberately leaves the printed bracket alone:
 * an entry line there already carries name, nationality and an entry-status badge, and the table
 * exists to answer "why these seeds". The on-screen draw has no seedings table — the bracket is the
 * only surface the fact can appear on, so leaving it unmarked leaves it nowhere.
 *
 * The marker sits INSIDE the seed's own brackets so the line does not grow; the basis itself is on
 * hover, which is the rule the presence work settled on — the fact is displayed, the detail is on
 * hover.
 *
 * `RANKING` is the ordinary basis and is never marked. An absent basis means the ordinary one, not
 * "unknown", so marking every seed would bury the one that is not.
 */
import { renderMatchUp } from '../components/renderStructure/renderMatchUp';
import { compositions } from '../compositions/compositions';
import { expect } from 'storybook/test';
import type { MatchUp } from '../types';

export default {
  title: 'Structure/Seeding basis'
};

const base = compositions.National ?? Object.values(compositions)[0];
const composition = { ...base, configuration: { ...base.configuration, bracketedSeeds: 'square' } };

function matchUp(side1: Record<string, any>, side2: Record<string, any>): MatchUp {
  return {
    matchUpId: `mu-${Math.random().toString(36).slice(2, 8)}`,
    matchUpType: 'SINGLES',
    structureId: 'struct-1',
    roundNumber: 1,
    roundPosition: 1,
    finishingRound: 5,
    sides: [
      { sideNumber: 1, participant: { participantId: 'p1', participantName: 'Ordinary Seed' }, ...side1 },
      { sideNumber: 2, participant: { participantId: 'p2', participantName: 'Additional Seed' }, ...side2 }
    ],
    score: { scoreStringSide1: '', scoreStringSide2: '' }
  } as unknown as MatchUp;
}

const CASES: { label: string; note: string; matchUp: MatchUp }[] = [
  {
    label: 'A protected ranking seeded above the count',
    note: 'side 2 carries the basis and is marked; side 1 is an ordinary seed and is not',
    matchUp: matchUp({ seedValue: 1 }, { seedValue: 9, seedingBasis: 'PROTECTED_RANKING' })
  },
  {
    label: 'Organiser discretion',
    note: 'the hover text names whichever basis the record carries',
    matchUp: matchUp({ seedValue: 2 }, { seedValue: 10, seedingBasis: 'ORGANISER_DISCRETION' })
  },
  {
    label: 'CONTROL — an explicit RANKING basis',
    note: 'the ordinary basis stated out loud is still ordinary: no marker, exactly as before',
    matchUp: matchUp({ seedValue: 3 }, { seedValue: 4, seedingBasis: 'RANKING' })
  },
  {
    label: 'CONTROL — no basis at all',
    note: 'an absent basis MEANS ranking; this is what every draw rendered before 7.1 looks like',
    matchUp: matchUp({ seedValue: 5 }, { seedValue: 6 })
  }
];

export const SeedingBasis = {
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
      themed.appendChild(renderMatchUp({ matchUp: mu, composition } as any));

      block.append(heading, subtitle, themed);
      outer.appendChild(block);
    }

    return outer;
  },

  // Local-only evidence: `test-storybook` is in no workflow. Asserts the whole point of the story —
  // a marker and a hover only where the basis is non-ordinary, and silence in both controls.
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const blocks = canvasElement.querySelectorAll('.chc-container');
    await expect(blocks).toHaveLength(CASES.length);

    const seedTexts = (block: Element) =>
      Array.from(block.querySelectorAll('.chc-seed')).map((el) => el.textContent?.trim());
    const seedTitles = (block: Element) =>
      Array.from(block.querySelectorAll('.chc-seed')).map((el) => (el as HTMLElement).title);

    // marked, and inside the brackets rather than after them
    await expect(seedTexts(blocks[0])).toEqual(['[1]', '[9†]']);
    await expect(seedTitles(blocks[0])).toEqual(['', 'Additional seed — protected ranking']);

    await expect(seedTexts(blocks[1])).toEqual(['[2]', '[10†]']);
    await expect(seedTitles(blocks[1])).toEqual(['', 'Additional seed — organiser discretion']);

    // both controls stay exactly as they rendered before the feature existed
    await expect(seedTexts(blocks[2])).toEqual(['[3]', '[4]']);
    await expect(seedTitles(blocks[2])).toEqual(['', '']);
    await expect(seedTexts(blocks[3])).toEqual(['[5]', '[6]']);
    await expect(seedTitles(blocks[3])).toEqual(['', '']);
  }
};
