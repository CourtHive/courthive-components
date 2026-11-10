import { resolveTeamColors } from '../teamBranding';
/** @vitest-environment happy-dom */
import { compositionSnapshot } from '../../composition-editor/compositionSnapshot';
import { compositions } from '../../../compositions/compositions';
import { renderScorecard } from '../renderScorecard';
import { describe, expect, it } from 'vitest';

function palette(primary: string, secondary?: string) {
  return {
    palette: [{ colorId: 'accent', value: primary }, ...(secondary ? [{ colorId: 'trim', value: secondary }] : [])],
    display: { primary: 'accent', ...(secondary && { secondary: 'trim' }) }
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
const accents = (card: HTMLElement) =>
  [...card.querySelectorAll<HTMLElement>('.chc-team-accent')].map((el) =>
    el.style.getPropertyValue('--chc-team-primary')
  );

describe('TEAM identity accents', () => {
  it.each([false, true])(
    'keeps names, scores, winner and line accents together with swap=%s and reversed input arrays',
    (swapSides) => {
      const matchUp = fixture();
      const original = JSON.stringify(matchUp);
      const card = renderScorecard({
        matchUp,
        composition: compositions.Scoreboard,
        teamBranding: true,
        swapSides
      });
      const names = [...card.querySelectorAll('.chc-scorecard-side-name')].map((el) => el.textContent);
      expect(names).toEqual(swapSides ? ['Beta', 'Alpha'] : ['Alpha', 'Beta']);
      const scores = [...card.querySelectorAll('.chc-scorecard-side-score')].map((el) => el.textContent);
      expect(scores).toEqual(swapSides ? ['2', '1'] : ['1', '2']);
      expect(card.querySelector('.chc-scorecard-side-score--winner')?.textContent).toBe('2');
      const expected = swapSides ? ['#FFFF00', '#FFFFFF'] : ['#FFFFFF', '#FFFF00'];
      expect(accents(card)).toEqual([...expected, ...expected]);
      for (const el of card.querySelectorAll<HTMLElement>('.chc-team-accent')) {
        expect(el.style.color).toBe('');
        expect(el.style.backgroundColor).toBe('');
      }
      expect(JSON.stringify(matchUp)).toBe(original);
    }
  );

  it('is opt-in and never recovers branding withheld from child identities', () => {
    const matchUp = fixture();
    expect(accents(renderScorecard({ matchUp }))).toEqual([]);
    for (const side of matchUp.tieMatchUps[0].sides)
      side.teamParticipant = { participantId: side.teamParticipant.participantId } as any;
    const card = renderScorecard({ matchUp, teamBranding: true });
    expect(accents(card)).toHaveLength(2); // header only: parent cannot restore private child attributes
    expect(card.querySelector('.chc-scorecard-card .chc-team-accent')).toBeNull();
  });

  it.each([{}, { 1: '#abcdef' }, () => undefined])(
    'explicit palettes own all sides, including blank results',
    (sideColors) => {
      const card = renderScorecard({
        matchUp: fixture(),
        teamBranding: true,
        composition: {
          ...compositions.Scoreboard,
          configuration: { ...compositions.Scoreboard.configuration, sideColors }
        }
      });
      expect(accents(card)).toEqual(
        typeof sideColors === 'function' || !Object.keys(sideColors).length ? [] : ['#abcdef']
      );
      expect(card.querySelector('.chc-scorecard-card .chc-team-accent')).toBeNull();
    }
  );

  it('tracks teams moving sides and substitutions without using individual colors', () => {
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
    expect(accents(renderScorecard({ matchUp, teamBranding: true }))).toEqual([
      '#FFFF00',
      '#FFFFFF',
      '#FFFF00',
      '#FFFFFF'
    ]);
  });

  it.each(['#000000', '#FFFF00', '#FFFFFF', '#110022'])(
    'accepts identical %s accents without altering outcome semantics',
    (primary) => {
      const matchUp = fixture();
      matchUp.sides = matchUp.sides.map((side) => ({
        ...side,
        participant: { ...side.participant, teamColors: palette(primary) }
      }));
      const card = renderScorecard({ matchUp, teamBranding: true });
      expect(accents(card).slice(0, 2)).toEqual([primary, primary]);
      expect(card.querySelector('.chc-scorecard-side-score--winner')?.textContent).toBe('2');
    }
  );

  it.each([false, true])('preserves identity-based explicit callbacks with swap=%s', (swapSides) => {
    const matchUp = fixture();
    const sideColors = ({ matchUp: rendered, sideNumber }: any) => {
      const side = rendered.sides.find((candidate: any) => candidate.sideNumber === sideNumber);
      return resolveTeamColors((side.teamParticipant ?? side.participant)?.teamColors)?.primary;
    };
    const card = renderScorecard({
      matchUp,
      teamBranding: true,
      swapSides,
      composition: {
        ...compositions.Scoreboard,
        configuration: { ...compositions.Scoreboard.configuration, sideColors }
      }
    });
    expect(accents(card)).toEqual(swapSides ? ['#FFFF00', '#FFFFFF'] : ['#FFFFFF', '#FFFF00']);
    const rows = [...card.querySelectorAll<HTMLElement>('.chc-scorecard-card .tmx-sd')];
    expect(rows.map((row) => row.style.getPropertyValue('--chc-side-color'))).toEqual(
      swapSides ? ['#FFFF00', '#FFFFFF'] : ['#FFFFFF', '#FFFF00']
    );
  });

  it('keeps doubles substitutions on their TEAM accents', () => {
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
    const card = renderScorecard({ matchUp, teamBranding: true, swapSides: true });
    expect(accents(card)).toEqual(['#FFFF00', '#FFFFFF', '#FFFF00', '#FFFFFF']);
    expect(card.textContent).toContain('Substitute');
    expect(card.textContent).toContain('Partner');
  });

  it('moves live point scores and the serving indicator with the branded TEAM on swap', () => {
    const matchUp = fixture();
    const line: any = matchUp.tieMatchUps[0];
    line.matchUpStatus = 'IN_PROGRESS';
    line.serverSideNumber = 2;
    line.score = {
      sets: [
        {
          setNumber: 1,
          side1Score: 1,
          side2Score: 2,
          side1PointScore: '15',
          side2PointScore: '30'
        }
      ]
    };
    const original = JSON.stringify(matchUp);
    const card = renderScorecard({
      matchUp,
      teamBranding: true,
      swapSides: true,
      composition: compositions.Scoreboard
    });
    const top = card.querySelector('.chc-scorecard-card .tmx-sd[sidenumber="1"]')!;
    expect(top.textContent).toContain('Player 2');
    expect(top.querySelector('.chc-point-score')?.textContent).toBe('30');
    expect(top.querySelector('.chc-server--active')).not.toBeNull();
    expect(JSON.stringify(matchUp)).toBe(original);
  });

  it('rejects malformed and non-TEAM data', () => {
    const matchUp = fixture();
    matchUp.sides = matchUp.sides.map((side) => ({
      ...side,
      participant: { ...side.participant, participantType: 'PAIR' }
    }));
    matchUp.tieMatchUps[0].sides.forEach((side) => {
      side.teamParticipant = { ...side.teamParticipant, teamColors: palette('red') };
    });
    expect(accents(renderScorecard({ matchUp, teamBranding: true }))).toEqual([]);
  });
});

it('keeps the generic preset neutral and round-trips explicit maps while removing runtime callbacks', () => {
  expect(compositions.Scoreboard.configuration?.sideColors).toBeUndefined();
  const snapshot = (sideColors: any) =>
    compositionSnapshot({
      ...compositions.Scoreboard,
      compositionName: 'Scoreboard',
      configuration: { ...compositions.Scoreboard.configuration, sideColors }
    });
  expect(snapshot({ 1: '#FFFFFF' }).configuration.sideColors).toEqual({ 1: '#FFFFFF' });
  expect(snapshot(() => '#FFFFFF').configuration.sideColors).toBeUndefined();
});

it('accepts old TEAM subsets without a type marker and refuses explicitly non-TEAM tie identities', () => {
  const matchUp = fixture();
  for (const side of matchUp.tieMatchUps[0].sides) {
    const { participantType: _type, ...legacyTeam } = side.teamParticipant;
    side.teamParticipant = legacyTeam as any;
  }
  expect(accents(renderScorecard({ matchUp, teamBranding: true }))).toHaveLength(4);
  for (const side of matchUp.tieMatchUps[0].sides)
    side.teamParticipant = { ...side.teamParticipant, participantType: 'PAIR' };
  expect(accents(renderScorecard({ matchUp, teamBranding: true }))).toHaveLength(2);
});
