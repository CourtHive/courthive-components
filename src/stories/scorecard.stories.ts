import { mocksEngine, tournamentEngine, eventConstants } from 'tods-competition-factory';
import { renderScorecard, renderTeamVsHeader } from '../components/scorecard';
import { compositions } from '../compositions/compositions';

const { TEAM: TEAM_EVENT } = eventConstants;

function generateTeamMatchUp({ completeAllMatchUps = false } = {}) {
  mocksEngine.generateTournamentRecord({
    drawProfiles: [{ drawSize: 4, eventType: TEAM_EVENT, drawType: 'SINGLE_ELIMINATION' }],
    completeAllMatchUps,
    setState: true,
  });

  const { matchUps } = tournamentEngine.allTournamentMatchUps({
    participantsProfile: { withISO2: true },
    inContext: true,
  });

  // Find a TEAM matchUp that has tieMatchUps
  return matchUps.find((m: any) => m.matchUpType === 'TEAM' && m.tieMatchUps?.length);
}

const eventHandlers = {
  scoreClick: (params) => console.log('score click', params),
  matchUpClick: (params) => console.log('matchUp click', params),
  participantClick: (params) => console.log('participant click', params),
};

export default {
  title: 'Team/Scorecard',
  tags: ['autodocs'],
  render: ({ compositionName = 'National', completeAllMatchUps = false }) => {
    const composition = compositions[compositionName] || compositions['National'];
    const matchUp = generateTeamMatchUp({ completeAllMatchUps });
    if (!matchUp) {
      const el = document.createElement('div');
      el.textContent = 'No team matchUp generated — check factory configuration';
      el.style.cssText = 'padding: 2rem; color: red;';
      return el;
    }
    return renderScorecard({ matchUp, composition, eventHandlers });
  },
  argTypes: {
    compositionName: {
      control: 'select',
      options: Object.keys(compositions).filter((k) => k !== 'Night' && k !== 'InlineScoring'),
      description: 'Draw composition theme',
    },
    completeAllMatchUps: {
      control: 'boolean',
      description: 'Generate with all matchUps completed',
    },
  },
};

export const InProgress = {
  args: { compositionName: 'National', completeAllMatchUps: false },
};

export const Completed = {
  args: { compositionName: 'National', completeAllMatchUps: true },
};

export const FrenchTheme = {
  args: { compositionName: 'French', completeAllMatchUps: true },
};

export const WimbledonTheme = {
  args: { compositionName: 'Wimbledon', completeAllMatchUps: true },
};

export const ITFTheme = {
  args: { compositionName: 'ITF', completeAllMatchUps: true },
};

export const AustralianTheme = {
  args: { compositionName: 'Australian', completeAllMatchUps: true },
};

export const TeamVsHeaderOnly = {
  render: () => {
    const matchUp = generateTeamMatchUp({ completeAllMatchUps: true });
    if (!matchUp) {
      const el = document.createElement('div');
      el.textContent = 'No team matchUp generated';
      return el;
    }
    const side1 = matchUp.sides?.[0]?.participant?.participantName || 'Team 1';
    const side2 = matchUp.sides?.[1]?.participant?.participantName || 'Team 2';
    return renderTeamVsHeader({
      side1Name: side1,
      side2Name: side2,
      sets: matchUp.score?.sets,
      winningSide: matchUp.winningSide,
    });
  },
};
