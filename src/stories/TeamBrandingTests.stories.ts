/**
 * Team scorecard — TEAM identity accents, play-function tests.
 *
 * Pinned here:
 *
 * - names, scores, the winner and line accents stay together through a swap and reversed input arrays;
 * - branding is opt-in, and a parent never restores branding withheld from child identities;
 * - an explicit `sideColors` (map, empty map, or callback) owns every side, including blank results;
 * - teams moving sides and substitutions keep the TEAM accent, never an individual's colors;
 * - identical accents do not alter the outcome; malformed or non-TEAM data paints nothing;
 * - live point scores and the serving indicator move with the branded team on swap;
 * - the readable name paint is resolved once the card is attached and again on a theme switch, against the
 *   surface it sits on, without touching the stored brand values.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm test:stories` (Storybook's Vitest integration, headless Chromium)
 */

import { renderScorecard } from '../components/scorecard/renderScorecard';
import { resolveTeamColors } from '../components/scorecard/teamBranding';
import { compositions } from '../compositions/compositions';
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';

const meta: Meta = {
  title: 'Scoring/Team Scorecard/Tests/Team Branding',
  // A play-function test: hidden from the sidebar, still run by `pnpm test:stories`.
  tags: ['!dev']
};
export default meta;

const WINNER_SCORE = '.chc-scorecard-side-score--winner';
const ACCENT = '.chc-team-accent';
const LINE_ACCENT = '.chc-scorecard-card .chc-team-accent';

function palette(primary: string, secondary?: string) {
  return {
    palette: [{ colorId: 'accent', value: primary }, ...(secondary ? [{ colorId: 'trim', value: secondary }] : [])],
    display: { roles: { 'team.accent': 'accent', ...(secondary && { 'team.surface': 'trim' }) } }
  };
}
const alpha = {
  participantId: 'alpha',
  participantType: 'TEAM',
  participantName: 'Alpha',
  teamColors: palette('#FFFFFF', '#000000')
};
const beta = {
  participantId: 'beta',
  participantType: 'TEAM',
  participantName: 'Beta',
  teamColors: palette('#FFFF00')
};
function fixture() {
  return {
    matchUpId: 'dual',
    matchUpType: 'TEAM',
    winningSide: 2,
    score: { sets: [{ setNumber: 1, side1Score: 1, side2Score: 2 }] },
    sides: [
      { sideNumber: 2, participant: beta },
      { sideNumber: 1, participant: alpha }
    ],
    tieFormat: { collectionDefinitions: [{ collectionId: 'singles', collectionName: 'Singles' }] },
    tieMatchUps: [
      {
        matchUpId: 'line',
        matchUpType: 'SINGLES',
        collectionId: 'singles',
        collectionPosition: 1,
        sides: [2, 1].map((sideNumber) => ({
          sideNumber,
          teamParticipant: sideNumber === 1 ? alpha : beta,
          participant: {
            participantId: `player${sideNumber}`,
            participantName: `Player ${sideNumber}`,
            participantType: 'INDIVIDUAL'
          }
        }))
      }
    ]
  };
}
const accentRows = (card: Element) => [...card.querySelectorAll<HTMLElement>(ACCENT)];
const accents = (card: Element) => accentRows(card).map((el) => el.style.getPropertyValue('--chc-team-accent'));

/** Inputs whose immutability a play asserts, keyed by case name. */
const inputs = new Map<string, { matchUp: unknown; original: string }>();
const remember = (key: string, matchUp: unknown) => inputs.set(key, { matchUp, original: JSON.stringify(matchUp) });
const expectUnchanged = (key: string) => {
  const input = inputs.get(key)!;
  expect(JSON.stringify(input.matchUp)).toBe(input.original);
};

/** One host holding a card per case, each wrapped in `[data-case]`. */
function cases(entries: [string, () => HTMLElement][]): HTMLElement {
  const host = document.createElement('div');
  for (const [name, build] of entries) {
    const wrap = document.createElement('div');
    wrap.dataset.case = name;
    wrap.appendChild(build());
    host.appendChild(wrap);
  }
  return host;
}
const card = (canvasElement: HTMLElement, name: string) =>
  canvasElement.querySelector<HTMLElement>(`[data-case="${name}"]`)!;

export const SwapKeepsIdentityTogether: StoryObj = {
  name: 'names, scores, winner and line accents stay together with swap and reversed input arrays',
  render: () =>
    cases(
      [false, true].map((swapSides) => [
        `swap-${swapSides}`,
        () => {
          const matchUp = fixture();
          remember(`swap-${swapSides}`, matchUp);
          return renderScorecard({ matchUp, composition: compositions.Scoreboard, teamBranding: true, swapSides });
        }
      ])
    ),
  play: async ({ canvasElement }) => {
    for (const swapSides of [false, true]) {
      const host = card(canvasElement, `swap-${swapSides}`);
      const names = [...host.querySelectorAll('.chc-scorecard-side-name')].map((el) => el.textContent);
      expect(names).toEqual(swapSides ? ['Beta', 'Alpha'] : ['Alpha', 'Beta']);
      const scores = [...host.querySelectorAll('.chc-scorecard-side-score')].map((el) => el.textContent);
      expect(scores).toEqual(swapSides ? ['2', '1'] : ['1', '2']);
      expect(host.querySelector(WINNER_SCORE)?.textContent).toBe('2');
      expect(accents(host)).toEqual(swapSides ? ['#FFFF00', '#FFFFFF'] : ['#FFFFFF', '#FFFF00']);
      for (const el of accentRows(host)) {
        expect(el.style.borderInlineStart).toBe('');
        expect(el.style.boxShadow).toBe('');
      }
      expectUnchanged(`swap-${swapSides}`);
    }
  }
};

export const OptInAndPrivacy: StoryObj = {
  name: 'branding is opt-in and never recovers branding withheld from child identities',
  render: () =>
    cases([
      ['unbranded', () => renderScorecard({ matchUp: fixture() })],
      [
        'withheld',
        () => {
          const matchUp = fixture();
          for (const side of matchUp.tieMatchUps[0].sides)
            side.teamParticipant = { participantId: side.teamParticipant.participantId } as any;
          return renderScorecard({ matchUp, teamBranding: true });
        }
      ]
    ]),
  play: async ({ canvasElement }) => {
    expect(accents(card(canvasElement, 'unbranded'))).toEqual([]);
    const withheld = card(canvasElement, 'withheld');
    expect(accents(withheld)).toHaveLength(0); // parent cannot restore private child attributes
    expect(withheld.querySelector(LINE_ACCENT)).toBeNull();
  }
};

const explicitPalettes: [string, unknown][] = [
  ['empty-map', {}],
  ['map', { 1: '#abcdef' }],
  ['blank-callback', () => undefined]
];
export const ExplicitPalettesOwnAllSides: StoryObj = {
  name: 'explicit sideColors own all sides, including blank results',
  render: () =>
    cases(
      explicitPalettes.map(([name, sideColors]) => [
        name,
        () =>
          renderScorecard({
            matchUp: fixture(),
            teamBranding: true,
            composition: {
              ...compositions.Scoreboard,
              configuration: { ...compositions.Scoreboard.configuration, sideColors } as any
            }
          })
      ])
    ),
  play: async ({ canvasElement }) => {
    for (const [name] of explicitPalettes) {
      const host = card(canvasElement, name);
      expect(accents(host), name).toEqual([]);
      expect(host.querySelector(LINE_ACCENT), name).toBeNull();
    }
  }
};

export const SidesMoveAndSubstitutions: StoryObj = {
  name: 'tracks teams moving sides and substitutions without using individual colors',
  render: () => {
    const matchUp = fixture();
    matchUp.sides.forEach((side) => {
      side.sideNumber = 3 - side.sideNumber;
    });
    matchUp.tieMatchUps[0].sides.forEach((side) => {
      side.sideNumber = 3 - side.sideNumber;
      side.participant = {
        ...side.participant,
        participantId: 'substitute',
        teamColors: palette('#123456')
      } as any;
    });
    return renderScorecard({ matchUp, teamBranding: true });
  },
  play: async ({ canvasElement }) => {
    expect(accents(canvasElement)).toEqual(['#FFFF00', '#FFFFFF']);
  }
};

const identicalPrimaries = ['#000000', '#FFFF00', '#FFFFFF', '#110022'];
export const IdenticalAccents: StoryObj = {
  name: 'identical accents leave outcome semantics alone',
  render: () =>
    cases(
      identicalPrimaries.map((primary) => [
        primary,
        () => {
          const matchUp = fixture();
          matchUp.sides = matchUp.sides.map((side) => ({
            ...side,
            participant: { ...side.participant, teamColors: palette(primary) }
          }));
          matchUp.tieMatchUps[0].sides.forEach((side) => {
            side.teamParticipant = { ...side.teamParticipant, teamColors: palette(primary) };
          });
          return renderScorecard({ matchUp, teamBranding: true });
        }
      ])
    ),
  play: async ({ canvasElement }) => {
    for (const primary of identicalPrimaries) {
      const host = card(canvasElement, primary);
      expect(accents(host)).toEqual([primary, primary]);
      expect(host.querySelectorAll('.chc-scorecard-header .chc-team-accent')).toHaveLength(0);
      expect(host.querySelector(WINNER_SCORE)?.textContent).toBe('2');
    }
  }
};

export const IdentityCallbacks: StoryObj = {
  name: 'preserves identity-based explicit callbacks with swap',
  render: () =>
    cases(
      [false, true].map((swapSides) => [
        `swap-${swapSides}`,
        () => {
          const sideColors = ({ matchUp: rendered, sideNumber }: any) => {
            const side = rendered.sides.find((candidate: any) => candidate.sideNumber === sideNumber);
            return resolveTeamColors((side.teamParticipant ?? side.participant)?.teamColors)?.roles['team.accent'];
          };
          return renderScorecard({
            matchUp: fixture(),
            teamBranding: true,
            swapSides,
            composition: {
              ...compositions.Scoreboard,
              configuration: { ...compositions.Scoreboard.configuration, sideColors }
            }
          });
        }
      ])
    ),
  play: async ({ canvasElement }) => {
    for (const swapSides of [false, true]) {
      const host = card(canvasElement, `swap-${swapSides}`);
      expect(accents(host)).toEqual([]);
      const rows = [...host.querySelectorAll<HTMLElement>('.chc-scorecard-card .tmx-sd')];
      expect(rows.map((row) => row.style.getPropertyValue('--chc-side-color'))).toEqual(
        swapSides ? ['#FFFF00', '#FFFFFF'] : ['#FFFFFF', '#FFFF00']
      );
    }
  }
};

export const DoublesSubstitutions: StoryObj = {
  name: 'keeps doubles substitutions on their TEAM accents',
  render: () => {
    const matchUp = fixture();
    matchUp.tieMatchUps[0].matchUpType = 'DOUBLES';
    for (const side of matchUp.tieMatchUps[0].sides)
      side.participant = {
        participantId: `pair-${side.sideNumber}`,
        participantType: 'PAIR',
        teamColors: palette('#123456'),
        individualParticipants: ['Substitute', 'Partner'].map((name) => ({
          participantId: `${name}-${side.sideNumber}`,
          participantName: name,
          person: { standardFamilyName: name, standardGivenName: 'New' }
        }))
      } as any;
    return renderScorecard({ matchUp, teamBranding: true, swapSides: true });
  },
  play: async ({ canvasElement }) => {
    expect(accents(canvasElement)).toEqual(['#FFFF00', '#FFFFFF']);
    expect(canvasElement.textContent).toContain('Substitute');
    expect(canvasElement.textContent).toContain('Partner');
  }
};

export const LiveScoreAndServerOnSwap: StoryObj = {
  name: 'live point scores and the serving indicator move with the branded TEAM on swap',
  render: () => {
    const matchUp = fixture();
    const line: any = matchUp.tieMatchUps[0];
    line.matchUpStatus = 'IN_PROGRESS';
    line.serverSideNumber = 2;
    line.score = {
      sets: [{ setNumber: 1, side1Score: 1, side2Score: 2, side1PointScore: '15', side2PointScore: '30' }]
    };
    remember('live', matchUp);
    return renderScorecard({ matchUp, teamBranding: true, swapSides: true, composition: compositions.Scoreboard });
  },
  play: async ({ canvasElement }) => {
    const top = canvasElement.querySelector('.chc-scorecard-card .tmx-sd[sidenumber="1"]')!;
    expect(top.textContent).toContain('Player 2');
    expect(top.querySelector('.chc-point-score')?.textContent).toBe('30');
    expect(top.querySelector('.chc-server--active')).not.toBeNull();
    expectUnchanged('live');
  }
};

const SURFACE_TESTID = 'team-accent-surface';
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const isYellow = (color = '') => ['#ffff00', 'rgb(255, 255, 0)'].includes(color.toLowerCase());

export const ThemeSwitchRepaintsNames: StoryObj = {
  name: 're-resolves readable name paint after attach and on a theme switch without touching brand values',
  render: () => {
    const surface = document.createElement('div');
    surface.dataset.testid = SURFACE_TESTID;
    surface.style.backgroundColor = '#ffffff';
    surface.appendChild(
      renderScorecard({ matchUp: fixture(), composition: compositions.Scoreboard, teamBranding: true })
    );
    return surface;
  },
  play: async ({ canvasElement }) => {
    const root = document.documentElement;
    const previousTheme = root.dataset.theme;
    const surface = canvasElement.querySelector<HTMLElement>(`[data-testid="${SURFACE_TESTID}"]`)!;
    const betaName = () =>
      accentRows(surface)
        .find((el) => el.style.getPropertyValue('--chc-team-accent') === '#FFFF00')
        ?.querySelector<HTMLElement>('.chc-participant-name');
    try {
      // Cards are built detached; the paint is resolved on the frame after attach.
      await nextFrame();
      expect(betaName()).toBeTruthy();
      expect(isYellow(betaName()?.style.color)).toBe(false); // yellow on white is unreadable
      surface.style.backgroundColor = '#000000';
      // The library's theme switch: `data-theme` on <html>, as the Storybook preview decorator sets it.
      root.dataset.theme = 'dark';
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isYellow(betaName()?.style.color)).toBe(true);
      expect(accents(surface)).toEqual(['#FFFFFF', '#FFFF00']);
    } finally {
      if (previousTheme === undefined) delete root.dataset.theme;
      else root.dataset.theme = previousTheme;
    }
  }
};

export const RejectsMalformedAndNonTeam: StoryObj = {
  name: 'rejects malformed and non-TEAM data',
  render: () => {
    const matchUp = fixture();
    matchUp.sides = matchUp.sides.map((side) => ({
      ...side,
      participant: { ...side.participant, participantType: 'PAIR' }
    }));
    matchUp.tieMatchUps[0].sides.forEach((side) => {
      side.teamParticipant = { ...side.teamParticipant, teamColors: palette('red') };
    });
    return renderScorecard({ matchUp, teamBranding: true });
  },
  play: async ({ canvasElement }) => {
    expect(accents(canvasElement)).toEqual([]);
  }
};

export const LegacyTeamSubsets: StoryObj = {
  name: 'accepts old TEAM subsets without a type marker and refuses explicitly non-TEAM tie identities',
  render: () => {
    const legacy = fixture();
    for (const side of legacy.tieMatchUps[0].sides) {
      const { participantType: _type, ...legacyTeam } = side.teamParticipant;
      side.teamParticipant = legacyTeam as any;
    }
    const pair = fixture();
    for (const side of pair.tieMatchUps[0].sides)
      side.teamParticipant = { ...side.teamParticipant, participantType: 'PAIR' };
    return cases([
      ['legacy', () => renderScorecard({ matchUp: legacy, teamBranding: true })],
      ['pair', () => renderScorecard({ matchUp: pair, teamBranding: true })]
    ]);
  },
  play: async ({ canvasElement }) => {
    expect(accents(card(canvasElement, 'legacy'))).toHaveLength(2);
    expect(accents(card(canvasElement, 'pair'))).toHaveLength(0);
  }
};
